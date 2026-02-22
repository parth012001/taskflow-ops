import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { updateScoringConfigSchema } from "@/lib/validations/productivity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { departmentId } = await params;

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateScoringConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const config = await prisma.scoringConfig.upsert({
      where: { departmentId },
      update: {
        ...(data.weeklyOutputTarget !== undefined && {
          weeklyOutputTarget: data.weeklyOutputTarget,
        }),
        ...(data.outputWeight !== undefined && {
          outputWeight: data.outputWeight,
          qualityWeight: data.qualityWeight!,
          reliabilityWeight: data.reliabilityWeight!,
          consistencyWeight: data.consistencyWeight!,
        }),
      },
      create: {
        departmentId,
        weeklyOutputTarget: data.weeklyOutputTarget ?? 15,
        outputWeight: data.outputWeight ?? 0.35,
        qualityWeight: data.qualityWeight ?? 0.25,
        reliabilityWeight: data.reliabilityWeight ?? 0.25,
        consistencyWeight: data.consistencyWeight ?? 0.15,
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error(
      "PATCH /api/productivity/config/[departmentId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
