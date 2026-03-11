import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canViewAnalytics } from "@/lib/utils/permissions";
import { Role, Prisma } from "@prisma/client";
import { generalLimiter } from "@/lib/rate-limit";

interface DeptAggRow {
  departmentId: string;
  name: string;
  avg_composite: number;
  avg_output: number;
  avg_quality: number;
  avg_reliability: number;
  avg_consistency: number;
  scored_count: bigint;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DEPARTMENT_HEAD users intentionally see all departments here (not just
    // their own) so they can benchmark cross-department performance. Scoping is
    // handled at the productivity-scorecard level, not the analytics overview.
    if (!canViewAnalytics(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Analytics access required" },
        { status: 403 }
      );
    }

    const rateCheck = generalLimiter.check(`analytics-dept:${session.user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    // DB-level aggregation: avg per pillar grouped by department
    const deptAggregates = await prisma.$queryRaw<DeptAggRow[]>(Prisma.sql`
      SELECT
        d.id AS "departmentId",
        d.name,
        AVG(ps.composite) AS avg_composite,
        AVG(ps.output) AS avg_output,
        AVG(ps.quality) AS avg_quality,
        AVG(ps.reliability) AS avg_reliability,
        AVG(ps.consistency) AS avg_consistency,
        COUNT(ps.id)::bigint AS scored_count
      FROM "Department" d
      LEFT JOIN "User" u ON u."departmentId" = d.id
        AND u."isActive" = true
        AND u."deletedAt" IS NULL
        AND u.role != 'ADMIN'
      LEFT JOIN "ProductivityScore" ps ON ps."userId" = u.id
      GROUP BY d.id, d.name
      ORDER BY avg_composite DESC NULLS LAST
    `);

    // Total user counts per department (non-admin)
    const userCounts = await prisma.user.groupBy({
      by: ["departmentId"],
      where: { isActive: true, deletedAt: null, role: { not: "ADMIN" } },
      _count: { id: true },
    });
    const countByDept = new Map(
      userCounts
        .filter((c) => c.departmentId)
        .map((c) => [c.departmentId!, c._count.id])
    );

    const departments = deptAggregates.map((row) => {
      const scored = Number(row.scored_count);
      return {
        id: row.departmentId,
        name: row.name,
        composite: scored > 0 ? Math.round((row.avg_composite ?? 0) * 10) / 10 : 0,
        output: scored > 0 ? Math.round((row.avg_output ?? 0) * 10) / 10 : 0,
        quality: scored > 0 ? Math.round((row.avg_quality ?? 0) * 10) / 10 : 0,
        reliability: scored > 0 ? Math.round((row.avg_reliability ?? 0) * 10) / 10 : 0,
        consistency: scored > 0 ? Math.round((row.avg_consistency ?? 0) * 10) / 10 : 0,
        scoredCount: scored,
        totalCount: countByDept.get(row.departmentId) ?? 0,
      };
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("GET /api/analytics/department-comparison error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
