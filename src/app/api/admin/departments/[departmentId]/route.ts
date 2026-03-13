import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { mutationLimiter } from "@/lib/rate-limit";
import { updateDepartmentSchema } from "@/lib/validations/department";

type RouteParams = { params: Promise<{ departmentId: string }> };

// GET /api/admin/departments/[departmentId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { departmentId } = await params;

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        head: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!department || department.deletedAt) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const { deletedAt: _, ...result } = department;
    return NextResponse.json({ department: result });
  } catch (error) {
    console.error("GET /api/admin/departments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/departments/[departmentId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const rateLimit = mutationLimiter.check(`dept:${session.user.id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { departmentId } = await params;
    const body = await request.json();
    const parsed = updateDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, deletedAt: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const { name, description, headId } = parsed.data;

    // Check if there are any fields to update
    if (name === undefined && description === undefined && headId === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Check name uniqueness if name is being changed
    if (name !== undefined) {
      const nameConflict = await prisma.department.findFirst({
        where: { name, deletedAt: null, id: { not: departmentId } },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: "A department with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Validate headId if provided and not null
    if (headId !== undefined && headId !== null) {
      const headUser = await prisma.user.findUnique({
        where: { id: headId },
        select: { id: true, isActive: true, role: true },
      });

      if (!headUser || !headUser.isActive) {
        return NextResponse.json(
          { error: "Selected department head is not found or inactive" },
          { status: 400 }
        );
      }

      if (headUser.role !== "DEPARTMENT_HEAD") {
        return NextResponse.json(
          { error: "Selected user must have the DEPARTMENT_HEAD role" },
          { status: 400 }
        );
      }

      const existingHead = await prisma.department.findFirst({
        where: { headId, deletedAt: null, id: { not: departmentId } },
      });
      if (existingHead) {
        return NextResponse.json(
          { error: "This user is already heading another department" },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (headId !== undefined) data.headId = headId;

    const department = await prisma.department.update({
      where: { id: departmentId },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        head: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error("PATCH /api/admin/departments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/departments/[departmentId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const rateLimit = mutationLimiter.check(`dept:${session.user.id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { departmentId } = await params;

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, deletedAt: true },
    });

    if (!department || department.deletedAt) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Check for active users
    const activeUserCount = await prisma.user.count({
      where: { departmentId, isActive: true },
    });

    if (activeUserCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${activeUserCount} active user(s). Reassign or deactivate them first.`,
        },
        { status: 409 }
      );
    }

    // Soft delete and clear headId
    await prisma.department.update({
      where: { id: departmentId },
      data: { deletedAt: new Date(), headId: null },
    });

    return NextResponse.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/departments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
