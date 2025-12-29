import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TaskStatus, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Build base where clause based on role
    let ownerFilter: Prisma.TaskWhereInput = { ownerId: userId };

    if (userRole === "MANAGER") {
      const subordinates = await prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((s) => s.id);
      ownerFilter = { ownerId: { in: [userId, ...subordinateIds] } };
    } else if (userRole === "DEPARTMENT_HEAD" || userRole === "ADMIN") {
      ownerFilter = {}; // All tasks
    }

    const baseWhere: Prisma.TaskWhereInput = {
      ...ownerFilter,
      deletedAt: null,
    };

    // Get task counts by status
    const statusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { status: true },
    });

    const statusMap: Record<TaskStatus, number> = {
      NEW: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED_PENDING_REVIEW: 0,
      CLOSED_APPROVED: 0,
      REOPENED: 0,
    };

    statusCounts.forEach((item) => {
      statusMap[item.status] = item._count.status;
    });

    // Get overdue tasks count
    const now = new Date();
    const overdueCount = await prisma.task.count({
      where: {
        ...baseWhere,
        deadline: { lt: now },
        status: {
          notIn: [TaskStatus.CLOSED_APPROVED],
        },
      },
    });

    // Get tasks due today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dueTodayCount = await prisma.task.count({
      where: {
        ...baseWhere,
        deadline: { gte: todayStart, lte: todayEnd },
        status: { notIn: [TaskStatus.CLOSED_APPROVED] },
      },
    });

    // Get tasks due this week
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const dueThisWeekCount = await prisma.task.count({
      where: {
        ...baseWhere,
        deadline: { gte: now, lte: weekEnd },
        status: { notIn: [TaskStatus.CLOSED_APPROVED] },
      },
    });

    // Get tasks pending review (for managers)
    let pendingReviewCount = 0;
    if (userRole !== "EMPLOYEE") {
      const subordinateIds = await prisma.user
        .findMany({
          where: { managerId: userId },
          select: { id: true },
        })
        .then((s) => s.map((u) => u.id));

      pendingReviewCount = await prisma.task.count({
        where: {
          ownerId: { in: subordinateIds },
          status: TaskStatus.COMPLETED_PENDING_REVIEW,
          deletedAt: null,
        },
      });
    }

    // Get completion rate for this week
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const completedThisWeek = await prisma.task.count({
      where: {
        ...baseWhere,
        status: TaskStatus.CLOSED_APPROVED,
        completedAt: { gte: weekStart },
      },
    });

    const totalActiveThisWeek = await prisma.task.count({
      where: {
        ...baseWhere,
        createdAt: { lte: now },
        OR: [
          { status: TaskStatus.CLOSED_APPROVED, completedAt: { gte: weekStart } },
          { status: { not: TaskStatus.CLOSED_APPROVED } },
        ],
      },
    });

    const completionRate = totalActiveThisWeek > 0
      ? Math.round((completedThisWeek / totalActiveThisWeek) * 100)
      : 0;

    // Get recent activity (last 5 status changes)
    const recentActivity = await prisma.taskStatusHistory.findMany({
      where: {
        task: baseWhere,
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
        changedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get KPI breakdown
    const kpiBreakdown = await prisma.task.groupBy({
      by: ["kpiBucketId"],
      where: baseWhere,
      _count: { id: true },
    });

    const kpiBuckets = await prisma.kpiBucket.findMany({
      where: { id: { in: kpiBreakdown.map((k) => k.kpiBucketId) } },
      select: { id: true, name: true },
    });

    const kpiStats = kpiBreakdown.map((item) => ({
      kpiBucketId: item.kpiBucketId,
      name: kpiBuckets.find((k) => k.id === item.kpiBucketId)?.name || "Unknown",
      count: item._count.id,
    }));

    // Get streak info for current user
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    // Get user's recognitions/badges
    const recognitions = await prisma.userRecognition.findMany({
      where: { userId },
      orderBy: { awardedDate: "desc" },
    });

    // Get active announcements (limit 5 for dashboard)
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
    });

    // Sort announcements by priority (HIGH first)
    const priorityOrder = { HIGH: 0, NORMAL: 1, LOW: 2 };
    announcements.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      return aPriority - bPriority;
    });

    return NextResponse.json({
      statusCounts: statusMap,
      totalTasks: Object.values(statusMap).reduce((a, b) => a + b, 0),
      activeTasks: statusMap.IN_PROGRESS + statusMap.ON_HOLD + statusMap.NEW + statusMap.ACCEPTED + statusMap.REOPENED,
      completedTasks: statusMap.CLOSED_APPROVED,
      overdueCount,
      dueTodayCount,
      dueThisWeekCount,
      pendingReviewCount,
      completionRate,
      kpiStats,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        taskId: a.task.id,
        taskTitle: a.task.title,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        changedBy: `${a.changedBy.firstName} ${a.changedBy.lastName}`,
        createdAt: a.createdAt,
      })),
      streak: userStreak ? {
        current: userStreak.currentStreak,
        longest: userStreak.longestStreak,
        lastActive: userStreak.lastActiveDate,
      } : null,
      recognitions: recognitions.map((r) => ({
        id: r.id,
        type: r.type,
        awardedFor: r.awardedFor,
        awardedDate: r.awardedDate,
      })),
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        type: a.type,
        priority: a.priority,
        author: `${a.author.firstName} ${a.author.lastName}`,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
