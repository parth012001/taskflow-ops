import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations/task";
import { canViewTask, canEditTask } from "@/lib/utils/permissions";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, managerId: true },
        },
        assigner: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
        kpiBucket: {
          select: { id: true, name: true, description: true },
        },
        comments: {
          where: { deletedAt: null, parentId: null },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
            replies: {
              where: { deletedAt: null },
              include: {
                author: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        carryForwardLogs: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        editHistory: {
          include: {
            editedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check view permission
    const subordinates = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    });
    const subordinateIds = subordinates.map((s) => s.id);

    if (!canViewTask(session.user.role, session.user.id, task.ownerId, subordinateIds)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[taskId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check edit permission - only owner can edit
    if (!canEditTask(session.user.role, session.user.id, task.ownerId)) {
      return NextResponse.json(
        { error: "Only the task owner can edit this task" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.safeParse(body);

    if (!validatedData.success) {
      console.warn("Validation error:", validatedData.error.flatten());
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (validatedData.data.title !== undefined) {
      updateData.title = validatedData.data.title;
    }
    if (validatedData.data.description !== undefined) {
      updateData.description = validatedData.data.description;
    }
    if (validatedData.data.priority !== undefined) {
      updateData.priority = validatedData.data.priority;
    }
    if (validatedData.data.size !== undefined) {
      updateData.size = validatedData.data.size;
    }
    if (validatedData.data.estimatedMinutes !== undefined) {
      updateData.estimatedMinutes = validatedData.data.estimatedMinutes;
    }
    if (validatedData.data.actualMinutes !== undefined) {
      updateData.actualMinutes = validatedData.data.actualMinutes;
    }
    if (validatedData.data.deadline !== undefined) {
      updateData.deadline = new Date(validatedData.data.deadline);
    }
    if (validatedData.data.startDate !== undefined) {
      updateData.startDate = validatedData.data.startDate
        ? new Date(validatedData.data.startDate)
        : null;
    }
    if (validatedData.data.kpiBucketId !== undefined) {
      // Verify KPI bucket exists
      const kpiBucket = await prisma.kpiBucket.findUnique({
        where: { id: validatedData.data.kpiBucketId },
      });
      if (!kpiBucket) {
        return NextResponse.json({ error: "KPI bucket not found" }, { status: 404 });
      }
      updateData.kpiBucketId = validatedData.data.kpiBucketId;
    }

    // Detect field changes for audit history
    const fieldsToTrack = [
      "title",
      "description",
      "priority",
      "size",
      "estimatedMinutes",
      "actualMinutes",
      "deadline",
      "startDate",
      "kpiBucketId",
    ] as const;

    const editHistoryEntries: {
      taskId: string;
      editedById: string;
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }[] = [];

    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined) {
        const oldVal = task[field as keyof typeof task];
        const newVal = updateData[field];

        // Convert to comparable strings
        const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? "");
        const newStr = newVal instanceof Date ? newVal.toISOString() : String(newVal ?? "");

        // Only log if actually changed
        if (oldStr !== newStr) {
          editHistoryEntries.push({
            taskId,
            editedById: session.user.id,
            fieldName: field,
            oldValue: oldStr || null,
            newValue: newStr || null,
          });
        }
      }
    }

    // Use transaction to update task + create edit history
    const [updatedTask] = await prisma.$transaction([
      prisma.task.update({
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
      }),
      ...editHistoryEntries.map((entry) =>
        prisma.taskEditHistory.create({ data: entry })
      ),
    ]);

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PUT /api/tasks/[taskId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Only owner or admin can delete
    if (task.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only the task owner or admin can delete this task" },
        { status: 403 }
      );
    }

    // Soft delete with actor tracking
    await prisma.task.update({
      where: { id: taskId },
      data: {
        deletedAt: new Date(),
        deletedById: session.user.id,
      },
    });

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/tasks/[taskId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
