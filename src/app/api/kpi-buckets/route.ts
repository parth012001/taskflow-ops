import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN sees all active KPIs (for management and task creation)
    if (session.user.role === "ADMIN") {
      const kpiBuckets = await prisma.kpiBucket.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          applicableRoles: true,
        },
      });
      return NextResponse.json(kpiBuckets);
    }

    // Non-admin users: Only see KPIs explicitly assigned to them via UserKpi
    const userKpis = await prisma.userKpi.findMany({
      where: { userId: session.user.id },
      include: {
        kpiBucket: {
          select: {
            id: true,
            name: true,
            description: true,
            applicableRoles: true,
            isActive: true,
          },
        },
      },
    });

    // Filter to only active KPIs and format response
    const kpiBuckets = userKpis
      .filter((uk) => uk.kpiBucket.isActive)
      .map((uk) => ({
        id: uk.kpiBucket.id,
        name: uk.kpiBucket.name,
        description: uk.kpiBucket.description,
        applicableRoles: uk.kpiBucket.applicableRoles,
      }));

    return NextResponse.json(kpiBuckets);
  } catch (error) {
    console.error("GET /api/kpi-buckets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
