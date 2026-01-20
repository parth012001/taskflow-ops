import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canAssignTasks } from "@/lib/utils/permissions";
import { Role } from "@prisma/client";

interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Only users with task:assign permission can see assignable users
    if (!canAssignTasks(userRole)) {
      return NextResponse.json([]);
    }

    const selectFields = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    };

    let assignableUsers: AssignableUser[];

    if (userRole === "MANAGER") {
      // Managers can only assign to their direct subordinates
      assignableUsers = await prisma.user.findMany({
        where: {
          managerId: userId,
          isActive: true,
          deletedAt: null,
        },
        select: selectFields,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
    } else if (userRole === "DEPARTMENT_HEAD") {
      // Department heads can assign to all users in their department
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (currentUser?.departmentId) {
        assignableUsers = await prisma.user.findMany({
          where: {
            departmentId: currentUser.departmentId,
            isActive: true,
            deletedAt: null,
            id: { not: userId },
          },
          select: selectFields,
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });
      } else {
        assignableUsers = [];
      }
    } else if (userRole === "ADMIN") {
      // Admins can assign to any active user
      assignableUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          id: { not: userId },
        },
        select: selectFields,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
    } else {
      assignableUsers = [];
    }

    return NextResponse.json(assignableUsers);
  } catch (error) {
    console.error("GET /api/tasks/assignees error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
