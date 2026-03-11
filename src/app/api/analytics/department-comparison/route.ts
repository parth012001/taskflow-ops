import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canViewAnalytics } from "@/lib/utils/permissions";
import { Role } from "@prisma/client";
import { generalLimiter } from "@/lib/rate-limit";

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

    const rateCheck = generalLimiter.check(`analytics-dept:${session.user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    // Fetch all active departments
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });

    // Fetch all productivity scores with user's department
    const scores = await prisma.productivityScore.findMany({
      where: {
        user: { isActive: true, deletedAt: null, role: { not: "ADMIN" } },
      },
      include: {
        user: { select: { departmentId: true } },
      },
    });

    // Fetch total user counts per department (non-admin)
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

    // Group scores by department
    const deptScores = new Map<string, typeof scores>();
    for (const score of scores) {
      const deptId = score.user.departmentId;
      if (!deptId) continue;
      const list = deptScores.get(deptId) || [];
      list.push(score);
      deptScores.set(deptId, list);
    }

    const result = departments
      .map((dept) => {
        const deptData = deptScores.get(dept.id) || [];
        const count = deptData.length;
        if (count === 0) {
          return {
            id: dept.id,
            name: dept.name,
            composite: 0,
            output: 0,
            quality: 0,
            reliability: 0,
            consistency: 0,
            scoredCount: 0,
            totalCount: countByDept.get(dept.id) ?? 0,
          };
        }
        return {
          id: dept.id,
          name: dept.name,
          composite: Math.round((deptData.reduce((s, r) => s + r.composite, 0) / count) * 10) / 10,
          output: Math.round((deptData.reduce((s, r) => s + r.output, 0) / count) * 10) / 10,
          quality: Math.round((deptData.reduce((s, r) => s + r.quality, 0) / count) * 10) / 10,
          reliability: Math.round((deptData.reduce((s, r) => s + r.reliability, 0) / count) * 10) / 10,
          consistency: Math.round((deptData.reduce((s, r) => s + r.consistency, 0) / count) * 10) / 10,
          scoredCount: count,
          totalCount: countByDept.get(dept.id) ?? count,
        };
      })
      .sort((a, b) => b.composite - a.composite);

    return NextResponse.json({ departments: result });
  } catch (error) {
    console.error("GET /api/analytics/department-comparison error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
