import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    const departments = await prisma.department.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        scoringConfig: true,
      },
      orderBy: { name: "asc" },
    });

    const configs = departments.map((dept) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      weeklyOutputTarget: dept.scoringConfig?.weeklyOutputTarget ?? 15,
      outputWeight: dept.scoringConfig?.outputWeight ?? 0.35,
      qualityWeight: dept.scoringConfig?.qualityWeight ?? 0.25,
      reliabilityWeight: dept.scoringConfig?.reliabilityWeight ?? 0.25,
      consistencyWeight: dept.scoringConfig?.consistencyWeight ?? 0.15,
      updatedAt: dept.scoringConfig?.updatedAt ?? null,
    }));

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("GET /api/productivity/config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
