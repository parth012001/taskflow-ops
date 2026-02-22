import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { productivityTrendsQuerySchema } from "@/lib/validations/productivity";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = productivityTrendsQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      console.warn("Validation error:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { userId, weeks } = parsed.data;
    const viewerRole = session.user.role as Role;
    const viewerId = session.user.id;

    // Determine target user
    const targetUserId = userId || viewerId;

    // Access control
    if (targetUserId !== viewerId) {
      if (!isManagerOrAbove(viewerRole)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      if (viewerRole === "MANAGER") {
        const subordinate = await prisma.user.findFirst({
          where: { id: targetUserId, managerId: viewerId },
          select: { id: true },
        });
        if (!subordinate) {
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
      }

      // Department heads can only see users in their department
      if (viewerRole === "DEPARTMENT_HEAD") {
        const deptUser = await prisma.user.findFirst({
          where: { id: targetUserId, departmentId: session.user.departmentId },
          select: { id: true },
        });
        if (!deptUser) {
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
      }
    }

    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - weeks * 7);

    const trends = await prisma.productivitySnapshot.findMany({
      where: {
        userId: targetUserId,
        weekStartDate: { gte: weeksAgo },
      },
      select: {
        weekStartDate: true,
        output: true,
        quality: true,
        reliability: true,
        consistency: true,
        composite: true,
      },
      orderBy: { weekStartDate: "asc" },
    });

    return NextResponse.json({
      trends: trends.map((t) => ({
        weekStartDate: t.weekStartDate.toISOString().split("T")[0],
        output: t.output,
        quality: t.quality,
        reliability: t.reliability,
        consistency: t.consistency,
        composite: t.composite,
      })),
    });
  } catch (error) {
    console.error("GET /api/productivity/trends error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
