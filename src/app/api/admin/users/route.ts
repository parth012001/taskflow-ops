import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  createUserSchema,
  listUsersQuerySchema,
  generateRandomPassword,
} from "@/lib/validations/user-management";
import { validateManagerIds, replaceManagers } from "@/lib/utils/manager-helpers";

// GET /api/admin/users - List all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryResult = listUsersQuerySchema.safeParse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      sortBy: searchParams.get("sortBy") || "firstName",
      sortOrder: searchParams.get("sortOrder") || "asc",
    });

    if (!queryResult.success) {
      console.warn("Validation error:", queryResult.error.flatten());
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { page, limit, search, role, departmentId, isActive, sortBy, sortOrder } =
      queryResult.data;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
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
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      users: users.map((user) => {
        const managers = user.managerRelations.map((r) => r.manager);
        const firstManager = managers[0];
        const managerName = firstManager
          ? `${firstManager.firstName} ${firstManager.lastName}${managers.length > 1 ? ` +${managers.length - 1}` : ""}`
          : null;
        return {
          ...user,
          managers,
          managerName,
          subordinateCount: user._count.subordinateRelations,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = createUserSchema.safeParse(body);

    if (!validationResult.success) {
      console.warn("Validation error:", validationResult.error.flatten());
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const {
      email,
      firstName,
      lastName,
      role,
      departmentId,
      managerIds,
      password,
      autoGeneratePassword,
    } = validationResult.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Validate managerIds if provided
    if (managerIds.length > 0) {
      const validation = await validateManagerIds(managerIds);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Validate departmentId if provided
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json({ error: "Department not found" }, { status: 400 });
      }
    }

    // Generate or use provided password
    const finalPassword = autoGeneratePassword ? generateRandomPassword() : password!;
    const passwordHash = await bcrypt.hash(finalPassword, 12);

    // Create user and manager relationships in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          role,
          departmentId: departmentId || null,
          passwordHash,
          mustChangePassword: true,
          isActive: true,
        },
      });

      if (managerIds.length > 0) {
        await replaceManagers(tx, newUser.id, managerIds);
      }

      return tx.user.findUniqueOrThrow({
        where: { id: newUser.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
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
        },
      });
    });

    const managers = user.managerRelations.map((r) => r.manager);

    return NextResponse.json(
      {
        user: { ...user, managers },
        ...(autoGeneratePassword && { temporaryPassword: finalPassword }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
