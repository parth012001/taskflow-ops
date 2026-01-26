import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviewers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.DEPARTMENT_HEAD, Role.ADMIN] },
        id: { not: session.user.id },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(reviewers);
  } catch (error) {
    console.error("GET /api/tasks/reviewers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
