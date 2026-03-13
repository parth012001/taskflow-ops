import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { mutationLimiter } from "@/lib/rate-limit";
import {
  createDepartmentSchema,
  listDepartmentsQuerySchema,
} from "@/lib/validations/department";

// GET /api/admin/departments - Get all departments (with optional pagination)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const hasPageParam = searchParams.has("page");

    if (!hasPageParam) {
      // Backward-compatible: return all departments without pagination
      const departments = await prisma.department.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ departments });
    }

    // Paginated response
    const params = Object.fromEntries(searchParams.entries());
    const parsed = listDepartmentsQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, search, sortBy, sortOrder } = parsed.data;

    const where = {
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          head: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.department.count({ where }),
    ]);

    return NextResponse.json({
      departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/departments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/departments - Create a new department
export async function POST(request: NextRequest) {
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

    const rateLimit = mutationLimiter.check(`dept:${session.user.id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = createDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, headId } = parsed.data;

    // Check name uniqueness
    const existing = await prisma.department.findFirst({
      where: { name, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 }
      );
    }

    // Validate headId if provided
    if (headId) {
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
        where: { headId, deletedAt: null },
      });
      if (existingHead) {
        return NextResponse.json(
          { error: "This user is already heading another department" },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        description: description ?? null,
        headId: headId ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        head: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/departments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
