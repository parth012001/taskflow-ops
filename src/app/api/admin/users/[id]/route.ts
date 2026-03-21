import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations/user-management";
import { validateManagerIds, replaceManagers } from "@/lib/utils/manager-helpers";

// GET /api/admin/users/[id] - Get a single user
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
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
        managerRelations: {
          select: {
            manager: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: { subordinateRelations: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const managers = user.managerRelations.map((r) => r.manager);
    const firstManager = managers[0];
    const managerName = firstManager
      ? `${firstManager.firstName} ${firstManager.lastName}${managers.length > 1 ? ` +${managers.length - 1}` : ""}`
      : null;

    return NextResponse.json({
      ...user,
      managers,
      managerName,
      subordinateCount: user._count.subordinateRelations,
    });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] - Update a user
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      console.warn("Validation error:", validationResult.error.flatten());
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { firstName, lastName, role, departmentId, managerIds, isActive } = validationResult.data;

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
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    }

    // Validate managerIds if provided
    if (managerIds !== undefined) {
      const validation = await validateManagerIds(managerIds, id);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Validate departmentId if provided
    if (departmentId !== undefined && departmentId !== null) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json({ error: "Department not found" }, { status: 400 });
      }
    }

    // Build update data
    const updateData: {
      firstName?: string;
      lastName?: string;
      role?: "EMPLOYEE" | "MANAGER" | "DEPARTMENT_HEAD" | "ADMIN";
      departmentId?: string | null;
      isActive?: boolean;
    } = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const hasFieldUpdates = Object.keys(updateData).length > 0;
    const hasManagerUpdates = managerIds !== undefined;

    if (!hasFieldUpdates && !hasManagerUpdates) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (hasFieldUpdates) {
        await tx.user.update({
          where: { id },
          data: updateData,
        });
      }

      if (hasManagerUpdates) {
        await replaceManagers(tx, id, managerIds!);
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
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
          managerRelations: {
            select: {
              manager: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          _count: {
            select: { subordinateRelations: true },
          },
        },
      });
    });

    const managers = updatedUser.managerRelations.map((r) => r.manager);
    const firstManager = managers[0];
    const managerName = firstManager
      ? `${firstManager.firstName} ${firstManager.lastName}${managers.length > 1 ? ` +${managers.length - 1}` : ""}`
      : null;

    return NextResponse.json({
      ...updatedUser,
      managers,
      managerName,
      subordinateCount: updatedUser._count.subordinateRelations,
    });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
