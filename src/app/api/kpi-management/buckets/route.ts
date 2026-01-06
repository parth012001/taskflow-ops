import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createKpiBucketSchema } from "@/lib/validations/kpi-management";

// GET /api/kpi-management/buckets - Fetch all KPI buckets (ADMIN only)
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

    const kpiBuckets = await prisma.kpiBucket.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            tasks: true,
            userKpis: true,
          },
        },
      },
    });

    return NextResponse.json({ kpiBuckets });
  } catch (error) {
    console.error("GET /api/kpi-management/buckets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/kpi-management/buckets - Create a new KPI bucket (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can create KPI buckets
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can create KPI buckets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createKpiBucketSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, applicableRoles } = validationResult.data;

    // Check if name already exists
    const existingBucket = await prisma.kpiBucket.findUnique({
      where: { name },
    });

    if (existingBucket) {
      return NextResponse.json(
        { error: "A KPI bucket with this name already exists" },
        { status: 409 }
      );
    }

    const kpiBucket = await prisma.kpiBucket.create({
      data: {
        name,
        description: description || null,
        applicableRoles,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            tasks: true,
            userKpis: true,
          },
        },
      },
    });

    return NextResponse.json(kpiBucket, { status: 201 });
  } catch (error) {
    console.error("POST /api/kpi-management/buckets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
