import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";

const sessionDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateSessionSchema = z.object({
  taskIds: z.array(z.string()).optional(),
  morningCompleted: z.boolean().optional(),
  eveningCompleted: z.boolean().optional(),
  morningNotes: z.string().max(2000).optional(),
  eveningNotes: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to today if no date provided
    const date = dateParam || new Date().toISOString().split("T")[0];

    const validatedDate = sessionDateSchema.safeParse({ date });
    if (!validatedDate.success) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Get or create daily planning session
    let planningSession = await prisma.dailyPlanningSession.findUnique({
      where: {
        userId_sessionDate: {
          userId: session.user.id,
          sessionDate: new Date(date),
        },
      },
      include: {
        tasks: {
          include: {
            task: {
              include: {
                kpiBucket: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // Get available tasks for planning (not completed, not in current session)
    const plannedTaskIds = planningSession?.tasks.map((t) => t.taskId) || [];

    const availableTasks = await prisma.task.findMany({
      where: {
        ownerId: session.user.id,
        deletedAt: null,
        status: {
          in: [
            TaskStatus.NEW,
            TaskStatus.ACCEPTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.ON_HOLD,
            TaskStatus.REOPENED,
          ],
        },
        id: { notIn: plannedTaskIds },
      },
      include: {
        kpiBucket: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { deadline: "asc" }],
    });

    return NextResponse.json({
      session: planningSession,
      availableTasks,
      date,
    });
  } catch (error) {
    console.error("GET /api/daily-planning error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam || new Date().toISOString().split("T")[0];

    // Validate date format
    const validatedDate = sessionDateSchema.safeParse({ date });
    if (!validatedDate.success) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }

    // Verify the date is valid (not NaN)
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date value" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateSessionSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { taskIds, morningCompleted, eveningCompleted, morningNotes, eveningNotes } =
      validatedData.data;

    // Use the already validated and parsed date
    const sessionDate = parsedDate;

    const updateData: Record<string, unknown> = {};
    if (morningCompleted !== undefined) {
      updateData.morningCompleted = morningCompleted;
      if (morningCompleted) updateData.morningCompletedAt = new Date();
    }
    if (eveningCompleted !== undefined) {
      updateData.eveningCompleted = eveningCompleted;
      if (eveningCompleted) updateData.eveningCompletedAt = new Date();
    }
    if (morningNotes !== undefined) updateData.morningNotes = morningNotes;
    if (eveningNotes !== undefined) updateData.eveningNotes = eveningNotes;

    const planningSession = await prisma.dailyPlanningSession.upsert({
      where: {
        userId_sessionDate: {
          userId: session.user.id,
          sessionDate,
        },
      },
      create: {
        userId: session.user.id,
        sessionDate,
        ...updateData,
      },
      update: updateData,
    });

    // If taskIds provided, update the planned tasks in a transaction
    if (taskIds !== undefined) {
      // Verify ownership of all tasks before proceeding
      if (taskIds.length > 0) {
        const ownedTasks = await prisma.task.findMany({
          where: {
            id: { in: taskIds },
            ownerId: session.user.id,
            deletedAt: null,
          },
          select: { id: true },
        });

        const ownedTaskIds = new Set(ownedTasks.map((t) => t.id));
        const unauthorizedTaskIds = taskIds.filter((id) => !ownedTaskIds.has(id));

        if (unauthorizedTaskIds.length > 0) {
          return NextResponse.json(
            { error: "Cannot add tasks you do not own to your daily plan" },
            { status: 403 }
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        // Delete existing session tasks
        await tx.dailySessionTask.deleteMany({
          where: { sessionId: planningSession.id },
        });

        // Create new session tasks (ownership already verified above)
        if (taskIds.length > 0) {
          await tx.dailySessionTask.createMany({
            data: taskIds.map((taskId, index) => ({
              sessionId: planningSession.id,
              taskId,
              orderIndex: index,
            })),
          });
        }
      });
    }

    // Fetch updated session with tasks
    const updatedSession = await prisma.dailyPlanningSession.findUnique({
      where: { id: planningSession.id },
      include: {
        tasks: {
          include: {
            task: {
              include: {
                kpiBucket: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    // Update user streak if morning ritual completed
    if (morningCompleted) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userStreak = await prisma.userStreak.findUnique({
        where: { userId: session.user.id },
      });

      if (userStreak) {
        const lastActive = userStreak.lastActiveDate
          ? new Date(userStreak.lastActiveDate)
          : null;

        if (lastActive) {
          lastActive.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor(
            (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff === 1) {
            // Consecutive day
            await prisma.userStreak.update({
              where: { userId: session.user.id },
              data: {
                currentStreak: userStreak.currentStreak + 1,
                longestStreak: Math.max(
                  userStreak.longestStreak,
                  userStreak.currentStreak + 1
                ),
                lastActiveDate: today,
              },
            });
          } else if (daysDiff > 1) {
            // Streak broken
            await prisma.userStreak.update({
              where: { userId: session.user.id },
              data: {
                currentStreak: 1,
                lastActiveDate: today,
              },
            });
          }
          // daysDiff === 0 means already updated today
        } else {
          // First activity
          await prisma.userStreak.update({
            where: { userId: session.user.id },
            data: {
              currentStreak: 1,
              longestStreak: Math.max(userStreak.longestStreak, 1),
              lastActiveDate: today,
            },
          });
        }
      } else {
        // Create streak record
        await prisma.userStreak.create({
          data: {
            userId: session.user.id,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: today,
          },
        });
      }
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("POST /api/daily-planning error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
