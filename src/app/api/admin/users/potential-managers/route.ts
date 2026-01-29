import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users/potential-managers - Get users who can be managers
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get users with role MANAGER, DEPARTMENT_HEAD, or ADMIN
    const managers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: {
          in: ["MANAGER", "DEPARTMENT_HEAD", "ADMIN"],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return NextResponse.json({ managers });
  } catch (error) {
    console.error("GET /api/admin/users/potential-managers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
