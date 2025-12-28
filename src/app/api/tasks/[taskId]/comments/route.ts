import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canViewTask } from "@/lib/utils/permissions";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000, "Comment too long"),
  parentId: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { ownerId: true },
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

    const comments = await prisma.taskComment.findMany({
      where: { taskId, deletedAt: null, parentId: null },
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
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("GET /api/tasks/[taskId]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
      select: { ownerId: true, title: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check view permission (if you can view, you can comment)
    const subordinates = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    });
    const subordinateIds = subordinates.map((s) => s.id);

    if (!canViewTask(session.user.role, session.user.id, task.ownerId, subordinateIds)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { content, parentId } = validatedData.data;

    // Verify parent comment exists if provided
    if (parentId) {
      const parentComment = await prisma.taskComment.findFirst({
        where: { id: parentId, taskId, deletedAt: null },
      });
      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: session.user.id,
        content,
        parentId,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Create notification for task owner (if commenter is not the owner)
    if (task.ownerId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.ownerId,
          type: "TASK_COMMENT",
          title: "New comment on your task",
          message: `${session.user.firstName} ${session.user.lastName} commented on "${task.title}"`,
          entityType: "Task",
          entityId: taskId,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
