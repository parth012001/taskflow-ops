import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { reassignTaskSchema } from "@/lib/validations/reassign";
import { Role, TaskStatus, AssignedByType } from "@prisma/client";

function isManagerOrAbove(role: Role): boolean {
  return role === Role.MANAGER || role === Role.DEPARTMENT_HEAD || role === Role.ADMIN;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAbove(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Only managers can reassign tasks" },
        { status: 403 }
      );
    }

    const { taskId } = await params;
    const body = await request.json();

    const validatedData = reassignTaskSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { newOwnerId, reason, newDeadline } = validatedData.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            managerId: true,
            departmentId: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === TaskStatus.CLOSED_APPROVED) {
      return NextResponse.json(
        { error: "Cannot reassign a completed task" },
        { status: 400 }
      );
    }

    if (task.ownerId === newOwnerId) {
      return NextResponse.json(
        { error: "Task is already assigned to this user" },
        { status: 400 }
      );
    }

    // Verify authority over task owner
    const userRole = session.user.role as Role;
    let hasAuthority = false;

    if (userRole === Role.ADMIN) {
      hasAuthority = true;
    } else if (userRole === Role.DEPARTMENT_HEAD) {
      hasAuthority = task.owner.departmentId === session.user.departmentId;
    } else if (userRole === Role.MANAGER) {
      hasAuthority = task.owner.managerId === session.user.id;
    }

    if (!hasAuthority) {
      return NextResponse.json(
        { error: "You do not have authority to reassign this user's tasks" },
        { status: 403 }
      );
    }

    // Verify new owner exists and is in scope
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId, isActive: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        managerId: true,
        departmentId: true,
      },
    });

    if (!newOwner) {
      return NextResponse.json({ error: "New owner not found" }, { status: 404 });
    }

    let newOwnerInScope = false;
    if (userRole === Role.ADMIN) {
      newOwnerInScope = true;
    } else if (userRole === Role.DEPARTMENT_HEAD) {
      newOwnerInScope = newOwner.departmentId === session.user.departmentId;
    } else if (userRole === Role.MANAGER) {
      newOwnerInScope = newOwner.managerId === session.user.id;
    }

    if (!newOwnerInScope) {
      return NextResponse.json(
        { error: "New owner is not within your scope" },
        { status: 403 }
      );
    }

    // Perform reassignment in transaction
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updateData: {
        ownerId: string;
        assignerId: string;
        assignedByType: AssignedByType;
        deadline?: Date;
      } = {
        ownerId: newOwnerId,
        assignerId: session.user.id,
        assignedByType: AssignedByType.MANAGER,
      };

      if (newDeadline) {
        updateData.deadline = new Date(newDeadline);
      }

      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
        select: {
          id: true,
          title: true,
          ownerId: true,
          deadline: true,
          status: true,
        },
      });

      await tx.taskStatusHistory.create({
        data: {
          taskId,
          fromStatus: task.status,
          toStatus: task.status,
          changedById: session.user.id,
          reason: `Reassigned: ${reason}`,
          metadata: {
            type: "reassignment",
            previousOwnerId: task.ownerId,
            previousOwnerName: `${task.owner.firstName} ${task.owner.lastName}`,
            newOwnerId,
            newOwnerName: `${newOwner.firstName} ${newOwner.lastName}`,
            reason,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: task.ownerId,
          type: "TASK_REASSIGNED",
          title: "Task reassigned",
          message: `Your task "${task.title}" has been reassigned to ${newOwner.firstName} ${newOwner.lastName}`,
          entityType: "Task",
          entityId: taskId,
        },
      });

      await tx.notification.create({
        data: {
          userId: newOwnerId,
          type: "TASK_REASSIGNED",
          title: "Task assigned to you",
          message: `"${task.title}" has been assigned to you by ${session.user.firstName} ${session.user.lastName}`,
          entityType: "Task",
          entityId: taskId,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/reassign error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
