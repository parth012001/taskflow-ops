import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/recognitions - Get current user's recognitions/badges
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recognitions = await prisma.userRecognition.findMany({
      where: { userId: session.user.id },
      orderBy: { awardedDate: "desc" },
    });

    return NextResponse.json({
      recognitions,
      total: recognitions.length,
    });
  } catch (error) {
    console.error("GET /api/recognitions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
