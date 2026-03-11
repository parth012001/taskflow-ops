import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canViewAnalytics } from "@/lib/utils/permissions";
import { Role, Prisma } from "@prisma/client";
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

    // Count active non-admin users
    const totalEmployees = await prisma.user.count({
      where: { isActive: true, deletedAt: null, role: { not: "ADMIN" } },
    });

    // DB-level aggregation for averages and count
    const scoreFilter: Prisma.ProductivityScoreWhereInput = {
      user: { isActive: true, deletedAt: null, role: { not: "ADMIN" } },
    };

    const [aggregates, scoredCount] = await Promise.all([
      prisma.productivityScore.aggregate({
        where: scoreFilter,
        _avg: { composite: true, output: true, quality: true, reliability: true, consistency: true },
      }),
      prisma.productivityScore.count({ where: scoreFilter }),
    ]);

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

    const avg = {
      composite: aggregates._avg.composite ?? 0,
      output: aggregates._avg.output ?? 0,
      quality: aggregates._avg.quality ?? 0,
      reliability: aggregates._avg.reliability ?? 0,
      consistency: aggregates._avg.consistency ?? 0,
    };

    // DB-level distribution bucketing via raw SQL
    const distributionRows = await prisma.$queryRaw<
      { band: string; count: bigint }[]
    >(Prisma.sql`
      SELECT
        CASE
          WHEN ps.composite >= 80 THEN 'thriving'
          WHEN ps.composite >= 60 THEN 'healthy'
          WHEN ps.composite >= 40 THEN 'atRisk'
          ELSE 'critical'
        END AS band,
        COUNT(*)::bigint AS count
      FROM "ProductivityScore" ps
      JOIN "User" u ON u.id = ps."userId"
      WHERE u."isActive" = true AND u."deletedAt" IS NULL AND u.role != 'ADMIN'
      GROUP BY band
    `);

    const distribution = { thriving: 0, healthy: 0, atRisk: 0, critical: 0 };
    for (const row of distributionRows) {
      distribution[row.band as keyof typeof distribution] = Number(row.count);
    }

    // Change: compare current avg vs snapshot averages from 4–8 weeks ago (DB-level)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const prevAggregates = await prisma.productivitySnapshot.aggregate({
      where: {
        user: { isActive: true, deletedAt: null, role: { not: "ADMIN" } },
        weekStartDate: { gte: eightWeeksAgo, lte: fourWeeksAgo },
      },
      _avg: { composite: true, output: true, quality: true, reliability: true, consistency: true },
      _count: { userId: true },
    });

    let change = 0;
    let biggestMover: { pillar: string; direction: string; delta: number } | null = null;

    if (prevAggregates._count.userId > 0) {
      const prevComposite = prevAggregates._avg.composite ?? 0;
      change = avg.composite - prevComposite;

      const prevPillarAvgs = {
        output: prevAggregates._avg.output ?? 0,
        quality: prevAggregates._avg.quality ?? 0,
        reliability: prevAggregates._avg.reliability ?? 0,
        consistency: prevAggregates._avg.consistency ?? 0,
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
