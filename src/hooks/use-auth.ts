"use client";

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  managerId: string | null;
  departmentId: string | null;
  mustChangePassword: boolean;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

interface UseAuthReturn {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isDepartmentHeadOrAbove: boolean;
  mustChangePassword: boolean;
  update: () => Promise<void>;
}

/**
 * Auth abstraction hook for future Clerk migration.
 * All new code should use this hook instead of useSession directly.
 * When migrating to Clerk, only this file needs to change.
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status, update } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!session?.user;

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        managerId: session.user.managerId,
        departmentId: session.user.departmentId,
        mustChangePassword: session.user.mustChangePassword ?? false,
      }
    : null;

  const authSession: AuthSession | null = session
    ? {
        user: user!,
        expires: session.expires,
      }
    : null;

  return {
    session: authSession,
    user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === "ADMIN",
    isManagerOrAbove:
      user?.role === "MANAGER" ||
      user?.role === "DEPARTMENT_HEAD" ||
      user?.role === "ADMIN",
    isDepartmentHeadOrAbove:
      user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN",
    mustChangePassword: user?.mustChangePassword ?? false,
    update: async () => {
      await update();
    },
  };
}

/**
 * Check if a role is manager or above
 */
export function isManagerOrAbove(role: Role): boolean {
  return role === "MANAGER" || role === "DEPARTMENT_HEAD" || role === "ADMIN";
}

/**
 * Check if a role is department head or above
 */
export function isDepartmentHeadOrAbove(role: Role): boolean {
  return role === "DEPARTMENT_HEAD" || role === "ADMIN";
}
