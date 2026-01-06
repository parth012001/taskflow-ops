import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { updateKpiAssignmentSchema } from "@/lib/validations/kpi-management";

interface RouteParams {
  params: Promise<{ userKpiId: string }>;
}

// PATCH /api/kpi-management/assign/[userKpiId] - Update target value for assignment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can update KPI assignments" },
        { status: 403 }
      );
    }

    const { userKpiId } = await params;

    const userKpi = await prisma.userKpi.findUnique({
      where: { id: userKpiId },
    });

    if (!userKpi) {
      return NextResponse.json(
        { error: "KPI assignment not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = updateKpiAssignmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { targetValue } = validationResult.data;

    const updatedUserKpi = await prisma.userKpi.update({
      where: { id: userKpiId },
      data: {
        targetValue: targetValue ?? null,
      },
      include: {
        kpiBucket: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      userKpiId: updatedUserKpi.id,
      kpiBucketId: updatedUserKpi.kpiBucketId,
      kpiBucketName: updatedUserKpi.kpiBucket.name,
      targetValue: updatedUserKpi.targetValue,
      currentValue: updatedUserKpi.currentValue,
    });
  } catch (error) {
    console.error("PATCH /api/kpi-management/assign/[userKpiId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/kpi-management/assign/[userKpiId] - Remove KPI assignment from user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can remove KPI assignments" },
        { status: 403 }
      );
    }

    const { userKpiId } = await params;

    const userKpi = await prisma.userKpi.findUnique({
      where: { id: userKpiId },
    });

    if (!userKpi) {
      return NextResponse.json(
        { error: "KPI assignment not found" },
        { status: 404 }
      );
    }

    // Hard delete the assignment
    await prisma.userKpi.delete({
      where: { id: userKpiId },
    });

    return NextResponse.json({ message: "KPI assignment removed successfully" });
  } catch (error) {
    console.error("DELETE /api/kpi-management/assign/[userKpiId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
