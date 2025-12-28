import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { carryForwardSchema } from "@/lib/validations/carry-forward";
import { TaskStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = carryForwardSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { newDeadline, reason } = validatedData.data;

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        ownerId: true,
        deadline: true,
        originalDeadline: true,
        carryForwardCount: true,
        status: true,
        title: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify ownership
    if (task.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only task owner can carry forward the task" },
        { status: 403 }
      );
    }

    // Verify task is not completed
    if (task.status === TaskStatus.CLOSED_APPROVED) {
      return NextResponse.json(
        { error: "Cannot carry forward a completed task" },
        { status: 400 }
      );
    }

    // Parse and validate new deadline
    const newDeadlineDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(newDeadlineDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date value" },
        { status: 400 }
      );
    }

    if (newDeadlineDate < today) {
      return NextResponse.json(
        { error: "New deadline must be today or in the future" },
        { status: 400 }
      );
    }

    // Optional: Limit carry-forward count
    const MAX_CARRY_FORWARD = 10;
    if (task.carryForwardCount >= MAX_CARRY_FORWARD) {
      return NextResponse.json(
        { error: `Task has been carried forward too many times (max ${MAX_CARRY_FORWARD})` },
        { status: 400 }
      );
    }

    // Perform carry-forward in transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Update task
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          deadline: newDeadlineDate,
          isCarriedForward: true,
          carryForwardCount: { increment: 1 },
          // Only set originalDeadline if not already set
          originalDeadline: task.originalDeadline || task.deadline,
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          isCarriedForward: true,
          carryForwardCount: true,
          originalDeadline: true,
        },
      });

      // Create CarryForwardLog
      await tx.carryForwardLog.create({
        data: {
          taskId,
          userId: session.user.id,
          fromDate: task.deadline,
          toDate: newDeadlineDate,
          reason,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/carry-forward error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
