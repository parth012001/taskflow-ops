import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canViewAnalytics } from "@/lib/utils/permissions";
import { companyTrendsQuerySchema } from "@/lib/validations/analytics";
import { Role } from "@prisma/client";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DEPARTMENT_HEAD users intentionally see company-wide trends (not just
    // their own department) so they can benchmark cross-department performance.
    if (!canViewAnalytics(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Analytics access required" },
        { status: 403 }
      );
    }

    const rateCheck = generalLimiter.check(`analytics-trends:${session.user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = companyTrendsQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { weeks } = parsed.data;

    // Align cutoff to Monday UTC 00:00 (same boundary used for snapshot weekStartDate)
    // so the query includes the full earliest week instead of cutting mid-week.
    const now = new Date();
    const day = now.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const currentMonday = new Date(now);
    currentMonday.setUTCDate(currentMonday.getUTCDate() + mondayOffset);
    currentMonday.setUTCHours(0, 0, 0, 0);
    const cutoff = new Date(currentMonday);
    cutoff.setUTCDate(cutoff.getUTCDate() - (weeks - 1) * 7);

    // Group snapshots by week. Snapshots are only written for active, non-admin,
    // scorable users (via saveWeeklySnapshot), so no live user filter is needed —
    // historical buckets reflect who was scored that week, not current user state.
    const snapshots = await prisma.productivitySnapshot.groupBy({
      by: ["weekStartDate"],
      where: {
        weekStartDate: { gte: cutoff },
      },
      _avg: {
        composite: true,
        output: true,
        quality: true,
        reliability: true,
        consistency: true,
      },
      _count: { userId: true },
      orderBy: { weekStartDate: "asc" },
    });

    const trends = snapshots.map((s) => ({
      weekStartDate: s.weekStartDate.toISOString().split("T")[0],
      composite: Math.round((s._avg.composite ?? 0) * 10) / 10,
      output: Math.round((s._avg.output ?? 0) * 10) / 10,
      quality: Math.round((s._avg.quality ?? 0) * 10) / 10,
      reliability: Math.round((s._avg.reliability ?? 0) * 10) / 10,
      consistency: Math.round((s._avg.consistency ?? 0) * 10) / 10,
      scoredCount: s._count.userId,
    }));

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("GET /api/analytics/company-trends error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
