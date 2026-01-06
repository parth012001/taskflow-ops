import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { updateKpiBucketSchema } from "@/lib/validations/kpi-management";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/kpi-management/buckets/[id] - Get single KPI bucket
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can access KPI management" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const kpiBucket = await prisma.kpiBucket.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tasks: true,
            userKpis: true,
          },
        },
      },
    });

    if (!kpiBucket) {
      return NextResponse.json(
        { error: "KPI bucket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(kpiBucket);
  } catch (error) {
    console.error("GET /api/kpi-management/buckets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/kpi-management/buckets/[id] - Update KPI bucket
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can update KPI buckets" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const kpiBucket = await prisma.kpiBucket.findUnique({
      where: { id },
    });

    if (!kpiBucket) {
      return NextResponse.json(
        { error: "KPI bucket not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = updateKpiBucketSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, applicableRoles, isActive } = validationResult.data;

    // Check if new name conflicts with existing bucket
    if (name && name !== kpiBucket.name) {
      const existingBucket = await prisma.kpiBucket.findUnique({
        where: { name },
      });

      if (existingBucket) {
        return NextResponse.json(
          { error: "A KPI bucket with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updatedKpiBucket = await prisma.kpiBucket.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(applicableRoles !== undefined && { applicableRoles }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json(updatedKpiBucket);
  } catch (error) {
    console.error("PATCH /api/kpi-management/buckets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/kpi-management/buckets/[id] - Soft delete KPI bucket
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin can delete KPI buckets" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const kpiBucket = await prisma.kpiBucket.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!kpiBucket) {
      return NextResponse.json(
        { error: "KPI bucket not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.kpiBucket.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "KPI bucket deactivated successfully" });
  } catch (error) {
    console.error("DELETE /api/kpi-management/buckets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
