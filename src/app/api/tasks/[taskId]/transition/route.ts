import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { transitionTaskSchema } from "@/lib/validations/task";
import {
  validateTransition,
  transitionRequiresReason,
  TransitionContext,
} from "@/lib/utils/task-state-machine";
import { TaskStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        owner: {
          select: { id: true, managerId: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = transitionTaskSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { toStatus, reason, onHoldReason } = validatedData.data;

    // Check if current user is the task owner's manager
    const isManager = task.owner.managerId === session.user.id;

    // Build transition context
    const context: TransitionContext = {
      taskOwnerId: task.ownerId,
      currentUserId: session.user.id,
      currentUserRole: session.user.role,
      isManager,
      reason,
      onHoldReason,
    };

    // Validate the transition using state machine
    const validation = validateTransition(task.status, toStatus, context);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid transition" },
        { status: 400 }
      );
    }

    // Check if reason is required but not provided
    if (transitionRequiresReason(task.status, toStatus)) {
      if (toStatus === TaskStatus.ON_HOLD && !onHoldReason) {
        return NextResponse.json(
          { error: "On-hold reason is required" },
          { status: 400 }
        );
      }
      if (toStatus === TaskStatus.REOPENED && !reason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    // Handle specific status transitions
    if (toStatus === TaskStatus.ON_HOLD) {
      updateData.onHoldReason = onHoldReason;
    }

    if (toStatus === TaskStatus.REOPENED) {
      updateData.rejectionReason = reason;
    }

    if (toStatus === TaskStatus.IN_PROGRESS && !task.startDate) {
      updateData.startDate = new Date();
    }

    if (toStatus === TaskStatus.CLOSED_APPROVED) {
      updateData.completedAt = new Date();
    }

    // Update task, create status history, and notifications in a single transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
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

      await tx.taskStatusHistory.create({
        data: {
          taskId,
          fromStatus: task.status,
          toStatus,
          changedById: session.user.id,
          reason: reason || onHoldReason || null,
          metadata: {
            previousOnHoldReason: task.onHoldReason,
            previousRejectionReason: task.rejectionReason,
          },
        },
      });

      // Create notification for relevant parties
      if (toStatus === TaskStatus.COMPLETED_PENDING_REVIEW && task.owner.managerId) {
        await tx.notification.create({
          data: {
            userId: task.owner.managerId,
            type: "TASK_PENDING_REVIEW",
            title: "Task pending review",
            message: `${session.user.firstName} ${session.user.lastName} submitted "${task.title}" for review`,
            entityType: "Task",
            entityId: taskId,
          },
        });
      }

      if (toStatus === TaskStatus.CLOSED_APPROVED) {
        await tx.notification.create({
          data: {
            userId: task.ownerId,
            type: "TASK_APPROVED",
            title: "Task approved",
            message: `Your task "${task.title}" has been approved`,
            entityType: "Task",
            entityId: taskId,
          },
        });
      }

      if (toStatus === TaskStatus.REOPENED) {
        await tx.notification.create({
          data: {
            userId: task.ownerId,
            type: "TASK_REOPENED",
            title: "Task reopened",
            message: `Your task "${task.title}" was reopened: ${reason}`,
            entityType: "Task",
            entityId: taskId,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/transition error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
