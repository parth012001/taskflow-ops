import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  createAnnouncementSchema,
  announcementQuerySchema,
} from "@/lib/validations/announcement";

// GET /api/announcements - Fetch announcements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = announcementQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? 10,
      activeOnly: searchParams.get("activeOnly") ?? true,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, activeOnly } = queryResult.data;

    const whereClause = activeOnly
      ? {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        }
      : {};

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" }, // HIGH > NORMAL > LOW
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Sort priority correctly (HIGH first, then NORMAL, then LOW)
    const priorityOrder = { HIGH: 0, NORMAL: 1, LOW: 2 };
    announcements.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      announcements,
      total: announcements.length,
    });
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create announcement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Permission check: Only ADMIN and DEPARTMENT_HEAD can create announcements
    if (!["ADMIN", "DEPARTMENT_HEAD"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Admin and Department Head can create announcements" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createAnnouncementSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, type, priority, expiresAt } = validationResult.data;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type,
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
