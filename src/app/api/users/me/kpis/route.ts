import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/users/me/kpis - Get current user's assigned KPIs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userKpis = await prisma.userKpi.findMany({
      where: { userId: session.user.id },
      include: {
        kpiBucket: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    // Filter to only active KPIs and format response
    const assignedKpis = userKpis
      .filter((uk) => uk.kpiBucket.isActive)
      .map((uk) => ({
        userKpiId: uk.id,
        kpiBucketId: uk.kpiBucket.id,
        kpiBucketName: uk.kpiBucket.name,
        description: uk.kpiBucket.description,
        targetValue: uk.targetValue,
        currentValue: uk.currentValue,
      }));

    return NextResponse.json({ assignedKpis });
  } catch (error) {
    console.error("GET /api/users/me/kpis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
