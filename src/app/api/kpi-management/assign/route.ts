import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { assignKpiSchema } from "@/lib/validations/kpi-management";

// POST /api/kpi-management/assign - Assign a KPI bucket to a user (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can assign KPIs
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can assign KPIs" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = assignKpiSchema.safeParse(body);

    if (!validationResult.success) {
      console.warn("Validation error:", validationResult.error.flatten());
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { userId, kpiBucketId, targetValue } = validationResult.data;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true, deletedAt: null },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 404 }
      );
    }

    // Check if KPI bucket exists and is active
    const kpiBucket = await prisma.kpiBucket.findUnique({
      where: { id: kpiBucketId, isActive: true },
    });

    if (!kpiBucket) {
      return NextResponse.json(
        { error: "KPI bucket not found or inactive" },
        { status: 404 }
      );
    }

    // Check if the KPI bucket is applicable to the user's role
    if (!kpiBucket.applicableRoles.includes(user.role)) {
      return NextResponse.json(
        { error: `This KPI is not applicable to ${user.role} role` },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userKpi.findUnique({
      where: {
        userId_kpiBucketId: {
          userId,
          kpiBucketId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "This KPI is already assigned to the user" },
        { status: 409 }
      );
    }

    // Create the assignment
    const userKpi = await prisma.userKpi.create({
      data: {
        userId,
        kpiBucketId,
        targetValue: targetValue ?? null,
        currentValue: 0,
      },
      include: {
        kpiBucket: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        userKpiId: userKpi.id,
        kpiBucketId: userKpi.kpiBucketId,
        kpiBucketName: userKpi.kpiBucket.name,
        targetValue: userKpi.targetValue,
        currentValue: userKpi.currentValue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/kpi-management/assign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
