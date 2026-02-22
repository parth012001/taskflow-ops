import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { calculateForUser } from "@/lib/productivity/calculate";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const viewerRole = session.user.role as Role;
    const viewerId = session.user.id;

    // Self access is always allowed
    if (viewerId !== userId) {
      if (!isManagerOrAbove(viewerRole)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      // Managers can only see subordinates
      if (viewerRole === "MANAGER") {
        const subordinate = await prisma.user.findFirst({
          where: { id: userId, managerId: viewerId },
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
          where: { id: userId, departmentId: session.user.departmentId },
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

    // Get user's department
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await calculateForUser(userId, user.departmentId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/productivity/scores/[userId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
