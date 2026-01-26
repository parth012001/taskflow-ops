import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createTaskSchema, taskQuerySchema } from "@/lib/validations/task";
import { canViewTask, canAssignTasks } from "@/lib/utils/permissions";
import { Prisma, TaskStatus, AssignedByType, Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = taskQuerySchema.safeParse(queryParams);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedQuery.error.flatten() },
        { status: 400 }
      );
    }

    const {
      status, priority, kpiBucketId, ownerId, search,
      fromDate, toDate, page, limit, sortBy, sortOrder
    } = validatedQuery.data;

    // Build where clause based on user role and permissions
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
    };

    // Role-based filtering
    const userRole = session.user.role;
    const userId = session.user.id;

    if (userRole === "EMPLOYEE") {
      // Employees can only see their own tasks
      where.ownerId = userId;
    } else if (userRole === "MANAGER") {
      // Managers can see own tasks + subordinates' tasks
      const subordinates = await prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      const subordinateIds = subordinates.map((s) => s.id);

      if (ownerId) {
        // If specific owner requested, verify permission
        if (ownerId !== userId && !subordinateIds.includes(ownerId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        where.ownerId = ownerId;
      } else {
        where.ownerId = { in: [userId, ...subordinateIds] };
      }
    } else if (userRole === "DEPARTMENT_HEAD" || userRole === "ADMIN") {
      // Can see all tasks, optionally filter by ownerId
      if (ownerId) {
        where.ownerId = ownerId;
      }
    }

    // Apply additional filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (kpiBucketId) where.kpiBucketId = kpiBucketId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (fromDate || toDate) {
      where.deadline = {};
      if (fromDate) where.deadline.gte = new Date(fromDate);
      if (toDate) where.deadline.lte = new Date(toDate);
    }

    // Count total for pagination
    const total = await prisma.task.count({ where });

    // Fetch tasks with relations
    const tasks = await prisma.task.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assigner: {
          select: { id: true, firstName: true, lastName: true },
        },
        kpiBucket: {
          select: { id: true, name: true },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTaskSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title, description, priority, size, kpiBucketId,
      estimatedMinutes, deadline, startDate, assigneeId,
      requiresReview: reqReview, reviewerId: reqReviewerId,
    } = validatedData.data;

    // Verify KPI bucket exists and is active
    const kpiBucket = await prisma.kpiBucket.findUnique({
      where: { id: kpiBucketId, isActive: true },
    });
    if (!kpiBucket) {
      return NextResponse.json(
        { error: "KPI bucket not found or inactive" },
        { status: 404 }
      );
    }

    // For non-admin: Verify the task owner has this KPI assigned
    // Note: We check assigneeId first (manager assigning to subordinate),
    // otherwise check the current user (self-assignment)
    if (session.user.role !== "ADMIN") {
      const targetUserId = assigneeId || session.user.id;
      const userKpi = await prisma.userKpi.findUnique({
        where: {
          userId_kpiBucketId: {
            userId: targetUserId,
            kpiBucketId,
          },
        },
      });

      if (!userKpi) {
        return NextResponse.json(
          { error: "This KPI is not assigned to the task owner" },
          { status: 403 }
        );
      }
    }

    // Determine owner and assignment type
    let ownerId = session.user.id;
    let assignerId: string | null = null;
    let assignedByType: AssignedByType = AssignedByType.SELF;

    if (assigneeId && assigneeId !== session.user.id) {
      // Manager assigning to subordinate
      if (!canAssignTasks(session.user.role)) {
        return NextResponse.json(
          { error: "You don't have permission to assign tasks" },
          { status: 403 }
        );
      }

      // Verify assignee is subordinate (for MANAGER role)
      if (session.user.role === "MANAGER") {
        const isSubordinate = await prisma.user.findFirst({
          where: { id: assigneeId, managerId: session.user.id },
        });
        if (!isSubordinate) {
          return NextResponse.json(
            { error: "You can only assign tasks to your subordinates" },
            { status: 403 }
          );
        }
      }

      ownerId = assigneeId;
      assignerId = session.user.id;
      assignedByType = session.user.role === "MANAGER"
        ? AssignedByType.MANAGER
        : AssignedByType.LEADERSHIP;
    }

    // Determine review settings based on role
    let requiresReview = reqReview ?? true;
    let reviewerId: string | null = reqReviewerId ?? null;
    const userRole = session.user.role;

    if (userRole === Role.DEPARTMENT_HEAD || userRole === Role.ADMIN) {
      // Dept heads and admins always skip review
      requiresReview = false;
      reviewerId = null;
    } else if (requiresReview) {
      if (userRole === Role.MANAGER) {
        // Manager with review ON: validate reviewer exists and has correct role
        if (reviewerId) {
          const reviewer = await prisma.user.findFirst({
            where: {
              id: reviewerId,
              isActive: true,
              role: { in: [Role.DEPARTMENT_HEAD, Role.ADMIN] },
              deletedAt: null,
            },
          });
          if (!reviewer) {
            return NextResponse.json(
              { error: "Selected reviewer not found or does not have the required role" },
              { status: 400 }
            );
          }
        }
        // reviewerId is optional for managers - if not set, fallback to managerId at review time
      } else if (userRole === Role.EMPLOYEE) {
        // Employee with review ON: auto-set reviewer to their manager
        const taskOwnerId = ownerId; // could be self or assigned user
        const taskOwner = await prisma.user.findUnique({
          where: { id: taskOwnerId },
          select: { managerId: true },
        });
        reviewerId = taskOwner?.managerId ?? null;
      }
    } else {
      // Review OFF
      reviewerId = null;
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        size,
        kpiBucketId,
        estimatedMinutes,
        deadline: new Date(deadline),
        startDate: startDate ? new Date(startDate) : null,
        ownerId,
        assignerId,
        assignedByType,
        requiresReview,
        reviewerId,
        status: TaskStatus.NEW,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assigner: {
          select: { id: true, firstName: true, lastName: true },
        },
        kpiBucket: {
          select: { id: true, name: true },
        },
      },
    });

    // Create initial status history entry
    await prisma.taskStatusHistory.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: TaskStatus.NEW,
        changedById: session.user.id,
        metadata: { action: "created" },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
