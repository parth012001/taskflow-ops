import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/kpi-management/users - Fetch all users with their KPI assignments (ADMIN only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can access KPI management
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can manage KPIs" },
        { status: 403 }
      );
    }

    // Fetch all active users except the current admin
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        id: { not: session.user.id },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        userKpis: {
          select: {
            id: true,
            kpiBucketId: true,
            targetValue: true,
            currentValue: true,
            kpiBucket: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { firstName: "asc" },
        { lastName: "asc" },
      ],
    });

    // Transform the data to match expected response shape
    const transformedUsers = users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      assignedKpis: user.userKpis.map((uk) => ({
        userKpiId: uk.id,
        kpiBucketId: uk.kpiBucketId,
        kpiBucketName: uk.kpiBucket.name,
        targetValue: uk.targetValue,
        currentValue: uk.currentValue,
      })),
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error("GET /api/kpi-management/users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
