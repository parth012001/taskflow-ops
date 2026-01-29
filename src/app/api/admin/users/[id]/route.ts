import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations/user-management";

// GET /api/admin/users/[id] - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        department: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { subordinates: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      managerName: user.manager
        ? `${user.manager.firstName} ${user.manager.lastName}`
        : null,
      subordinateCount: user._count.subordinates,
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, role, departmentId, managerId, isActive } =
      validationResult.data;

    // Find the user
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from deactivating themselves
    if (isActive === false && id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    // Prevent admin from changing their own role
    if (role !== undefined && id === session.user.id && role !== existingUser.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Validate managerId if provided
    if (managerId !== undefined && managerId !== null) {
      // Cannot set self as manager
      if (managerId === id) {
        return NextResponse.json(
          { error: "A user cannot be their own manager" },
          { status: 400 }
        );
      }

      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { role: true, isActive: true },
      });

      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found" },
          { status: 400 }
        );
      }

      if (!manager.isActive) {
        return NextResponse.json(
          { error: "Selected manager is inactive" },
          { status: 400 }
        );
      }

      if (manager.role === "EMPLOYEE") {
        return NextResponse.json(
          { error: "Selected user cannot be a manager (role too low)" },
          { status: 400 }
        );
      }
    }

    // Validate departmentId if provided
    if (departmentId !== undefined && departmentId !== null) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: {
      firstName?: string;
      lastName?: string;
      role?: "EMPLOYEE" | "MANAGER" | "DEPARTMENT_HEAD" | "ADMIN";
      departmentId?: string | null;
      managerId?: string | null;
      isActive?: boolean;
    } = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
        department: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { subordinates: true },
        },
      },
    });

    return NextResponse.json({
      ...updatedUser,
      managerName: updatedUser.manager
        ? `${updatedUser.manager.firstName} ${updatedUser.manager.lastName}`
        : null,
      subordinateCount: updatedUser._count.subordinates,
    });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
