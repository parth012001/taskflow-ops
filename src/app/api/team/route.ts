import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { TaskStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAbove(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get subordinates
    let subordinateIds: string[] = [];

    if (session.user.role === "MANAGER") {
      const subordinates = await prisma.user.findMany({
        where: { managerId: session.user.id, isActive: true },
        select: { id: true },
      });
      subordinateIds = subordinates.map((s) => s.id);
    } else if (session.user.role === "DEPARTMENT_HEAD") {
      // Get all users in department
      const departmentUsers = await prisma.user.findMany({
        where: { departmentId: session.user.departmentId, isActive: true },
        select: { id: true },
      });
      subordinateIds = departmentUsers.map((u) => u.id).filter((id) => id !== session.user.id);
    } else if (session.user.role === "ADMIN") {
      // Get all users
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      subordinateIds = allUsers.map((u) => u.id).filter((id) => id !== session.user.id);
    }

    // Get team members with their task stats
    const teamMembers = await prisma.user.findMany({
      where: { id: { in: subordinateIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        _count: {
          select: {
            tasksOwned: {
              where: {
                deletedAt: null,
                status: { not: TaskStatus.CLOSED_APPROVED },
              },
            },
          },
        },
      },
    });

    // Get task stats for each team member
    const teamWithStats = await Promise.all(
      teamMembers.map(async (member) => {
        const taskStats = await prisma.task.groupBy({
          by: ["status"],
          where: {
            ownerId: member.id,
            deletedAt: null,
          },
          _count: { status: true },
        });

        const now = new Date();
        const overdueCount = await prisma.task.count({
          where: {
            ownerId: member.id,
            deletedAt: null,
            deadline: { lt: now },
            status: { notIn: [TaskStatus.CLOSED_APPROVED] },
          },
        });

        const statusCounts: Record<string, number> = {};
        taskStats.forEach((stat) => {
          statusCounts[stat.status] = stat._count.status;
        });

        return {
          ...member,
          taskStats: statusCounts,
          overdueCount,
          totalActive: member._count.tasksOwned,
        };
      })
    );

    // Get tasks pending review from subordinates
    const pendingReviewTasks = await prisma.task.findMany({
      where: {
        ownerId: { in: subordinateIds },
        status: TaskStatus.COMPLETED_PENDING_REVIEW,
        deletedAt: null,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        kpiBucket: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      teamMembers: teamWithStats,
      pendingReviewTasks,
      summary: {
        totalMembers: teamMembers.length,
        totalPendingReview: pendingReviewTasks.length,
        totalOverdue: teamWithStats.reduce((sum, m) => sum + m.overdueCount, 0),
      },
    });
  } catch (error) {
    console.error("GET /api/team error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
