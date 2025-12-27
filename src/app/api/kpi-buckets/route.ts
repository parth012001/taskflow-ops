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

    const kpiBuckets = await prisma.kpiBucket.findMany({
      where: {
        isActive: true,
        // Filter by applicable roles for non-admin users
        ...(session.user.role !== "ADMIN" && {
          applicableRoles: {
            has: session.user.role,
          },
        }),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        applicableRoles: true,
      },
    });

    return NextResponse.json(kpiBuckets);
  } catch (error) {
    console.error("GET /api/kpi-buckets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
