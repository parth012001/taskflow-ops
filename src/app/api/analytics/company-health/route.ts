import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canViewAnalytics } from "@/lib/utils/permissions";
import { Role } from "@prisma/client";
import { generalLimiter } from "@/lib/rate-limit";

function getBand(score: number): string {
  if (score >= 80) return "thriving";
  if (score >= 60) return "healthy";
  if (score >= 40) return "atRisk";
  return "critical";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewAnalytics(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Analytics access required" },
        { status: 403 }
      );
    }

    const rateCheck = generalLimiter.check(`analytics-health:${session.user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    // Fetch all non-admin active users
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null, role: { not: "ADMIN" } },
      select: { id: true },
    });
    const userIds = activeUsers.map((u) => u.id);

    // Fetch all productivity scores for those users
    const scores = await prisma.productivityScore.findMany({
      where: { userId: { in: userIds } },
    });

    const totalEmployees = userIds.length;
    const scoredCount = scores.length;

    if (scoredCount === 0) {
      return NextResponse.json({
        companyScore: {
          composite: 0, output: 0, quality: 0, reliability: 0, consistency: 0,
          band: "critical", change: 0, scoredCount: 0, totalEmployees,
        },
        distribution: { thriving: 0, healthy: 0, atRisk: 0, critical: 0 },
        alerts: { atRiskCount: 0, biggestMover: null, unscorableCount: totalEmployees },
      });
    }

    // Compute averages
    const avg = {
      composite: scores.reduce((s, r) => s + r.composite, 0) / scoredCount,
      output: scores.reduce((s, r) => s + r.output, 0) / scoredCount,
      quality: scores.reduce((s, r) => s + r.quality, 0) / scoredCount,
      reliability: scores.reduce((s, r) => s + r.reliability, 0) / scoredCount,
      consistency: scores.reduce((s, r) => s + r.consistency, 0) / scoredCount,
    };

    // Distribution buckets
    const distribution = { thriving: 0, healthy: 0, atRisk: 0, critical: 0 };
    for (const score of scores) {
      const band = getBand(score.composite);
      distribution[band as keyof typeof distribution]++;
    }

    // Change: compare current avg vs snapshots from 4–8 weeks ago
    // Use only scored user IDs so the comparison cohort matches the current avg
    const scoredUserIds = scores.map((s) => s.userId);
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const previousSnapshots = await prisma.productivitySnapshot.findMany({
      where: {
        userId: { in: scoredUserIds },
        weekStartDate: { gte: eightWeeksAgo, lte: fourWeeksAgo },
      },
    });

    let change = 0;
    if (previousSnapshots.length > 0) {
      const prevAvg = previousSnapshots.reduce((s, r) => s + r.composite, 0) / previousSnapshots.length;
      change = avg.composite - prevAvg;
    }

    // Biggest mover: compare current pillar avgs vs previous period
    let biggestMover: { pillar: string; direction: string; delta: number } | null = null;
    if (previousSnapshots.length > 0) {
      const prevPillarAvgs = {
        output: previousSnapshots.reduce((s, r) => s + r.output, 0) / previousSnapshots.length,
        quality: previousSnapshots.reduce((s, r) => s + r.quality, 0) / previousSnapshots.length,
        reliability: previousSnapshots.reduce((s, r) => s + r.reliability, 0) / previousSnapshots.length,
        consistency: previousSnapshots.reduce((s, r) => s + r.consistency, 0) / previousSnapshots.length,
      };

      let maxDelta = 0;
      for (const pillar of ["output", "quality", "reliability", "consistency"] as const) {
        const delta = avg[pillar] - prevPillarAvgs[pillar];
        if (Math.abs(delta) > Math.abs(maxDelta)) {
          maxDelta = delta;
          biggestMover = {
            pillar,
            direction: delta >= 0 ? "up" : "down",
            delta: Math.round(Math.abs(delta) * 10) / 10,
          };
        }
      }
    }

    const atRiskCount = distribution.atRisk + distribution.critical;

    return NextResponse.json({
      companyScore: {
        composite: Math.round(avg.composite * 10) / 10,
        output: Math.round(avg.output * 10) / 10,
        quality: Math.round(avg.quality * 10) / 10,
        reliability: Math.round(avg.reliability * 10) / 10,
        consistency: Math.round(avg.consistency * 10) / 10,
        band: getBand(avg.composite),
        change: Math.round(change * 10) / 10,
        scoredCount,
        totalEmployees,
      },
      distribution,
      alerts: {
        atRiskCount,
        biggestMover,
        unscorableCount: totalEmployees - scoredCount,
      },
    });
  } catch (error) {
    console.error("GET /api/analytics/company-health error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
