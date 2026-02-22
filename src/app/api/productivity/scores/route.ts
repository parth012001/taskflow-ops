import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { productivityScoresQuerySchema } from "@/lib/validations/productivity";
import { Role, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAbove(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Manager access required" },
        { status: 403 }
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = productivityScoresQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { departmentId, role, sortBy, sortOrder, page, limit } = parsed.data;

    // Build user filter based on role
    let userFilter: Prisma.ProductivityScoreWhereInput = {};

    if (session.user.role === "MANAGER") {
      // Manager can only see subordinates
      const subordinates = await prisma.user.findMany({
        where: { managerId: session.user.id },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((s) => s.id);
      userFilter = { userId: { in: subordinateIds } };
    } else if (session.user.role === "DEPARTMENT_HEAD") {
      // Dept head scoped to own department, optionally overridden by param
      const deptId = departmentId ?? session.user.departmentId;
      if (deptId) {
        const deptUsers = await prisma.user.findMany({
          where: { departmentId: deptId },
          select: { id: true },
        });
        userFilter = { userId: { in: deptUsers.map((u) => u.id) } };
      }
    } else {
      // ADMIN can see all, optionally filtered by department
      if (departmentId) {
        const deptUsers = await prisma.user.findMany({
          where: { departmentId },
          select: { id: true },
        });
        userFilter = { userId: { in: deptUsers.map((u) => u.id) } };
      }
    }

    // Role filter
    if (role) {
      // Build user where clause, narrowing by existing filter if present
      const existingUserIds =
        userFilter.userId && typeof userFilter.userId === "object" && "in" in userFilter.userId
          ? (userFilter.userId.in as string[])
          : undefined;

      const roleUsers = await prisma.user.findMany({
        where: {
          role,
          ...(existingUserIds ? { id: { in: existingUserIds } } : {}),
        },
        select: { id: true },
      });
      userFilter = { userId: { in: roleUsers.map((u) => u.id) } };
    }

    const total = await prisma.productivityScore.count({ where: userFilter });

    const scores = await prisma.productivityScore.findMany({
      where: userFilter,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      scores: scores.map((s) => ({
        userId: s.userId,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        role: s.user.role,
        department: s.user.department?.name ?? null,
        output: s.output,
        quality: s.quality,
        reliability: s.reliability,
        consistency: s.consistency,
        composite: s.composite,
        calculatedAt: s.calculatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/productivity/scores error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
