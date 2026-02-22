import { Role } from "@prisma/client";

export type Permission =
  | "task:create"
  | "task:view_own"
  | "task:view_team"
  | "task:view_department"
  | "task:edit_own"
  | "task:assign"
  | "task:approve"
  | "task:reopen"
  | "task:delete"
  | "user:view_team"
  | "user:view_department"
  | "user:manage"
  | "radar:view"
  | "kpi:manage"
  | "announcement:create"
  | "productivity:view"
  | "productivity:manage";

const rolePermissions: Record<Role, Permission[]> = {
  EMPLOYEE: ["task:create", "task:view_own", "task:edit_own"],
  MANAGER: [
    "task:create",
    "task:view_own",
    "task:view_team",
    "task:edit_own",
    "task:assign",
    "task:approve",
    "task:reopen",
    "user:view_team",
    "radar:view",
    "productivity:view",
  ],
  DEPARTMENT_HEAD: [
    "task:create",
    "task:view_own",
    "task:view_team",
    "task:view_department",
    "task:edit_own",
    "task:assign",
    "task:approve",
    "task:reopen",
    "user:view_team",
    "user:view_department",
    "radar:view",
    "kpi:manage",
    "productivity:view",
  ],
  ADMIN: [
    "task:create",
    "task:view_own",
    "task:view_team",
    "task:view_department",
    "task:edit_own",
    "task:assign",
    "task:approve",
    "task:reopen",
    "task:delete",
    "user:view_team",
    "user:view_department",
    "user:manage",
    "radar:view",
    "kpi:manage",
    "announcement:create",
    "productivity:view",
    "productivity:manage",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Check if user can view a specific task
 */
export function canViewTask(
  viewerRole: Role,
  viewerId: string,
  taskOwnerId: string,
  viewerSubordinateIds: string[]
): boolean {
  // Owner can always view their own task
  if (viewerId === taskOwnerId) return true;

  // Manager can view subordinates' tasks
  if (
    viewerRole === "MANAGER" &&
    viewerSubordinateIds.includes(taskOwnerId)
  ) {
    return true;
  }

  // Department head and admin can view all tasks
  if (viewerRole === "DEPARTMENT_HEAD" || viewerRole === "ADMIN") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit a specific task
 */
export function canEditTask(
  editorRole: Role,
  editorId: string,
  taskOwnerId: string
): boolean {
  // Only owner can edit their task
  return editorId === taskOwnerId;
}

/**
 * Check if user can approve a task
 */
export function canApproveTask(
  approverRole: Role,
  approverId: string,
  taskOwnerId: string,
  approverSubordinateIds: string[]
): boolean {
  // Only managers+ can approve
  if (approverRole === "EMPLOYEE") return false;

  // Cannot approve own tasks
  if (approverId === taskOwnerId) return false;

  // Manager can approve subordinates' tasks
  if (
    approverRole === "MANAGER" &&
    approverSubordinateIds.includes(taskOwnerId)
  ) {
    return true;
  }

  // Department head and admin can approve any task
  if (approverRole === "DEPARTMENT_HEAD" || approverRole === "ADMIN") {
    return true;
  }

  return false;
}

/**
 * Check if user can assign tasks to others
 */
export function canAssignTasks(role: Role): boolean {
  return hasPermission(role, "task:assign");
}

/**
 * Check if user can view the workload radar
 */
export function canViewRadar(role: Role): boolean {
  return hasPermission(role, "radar:view");
}

/**
 * Check if user is a manager or higher
 */
export function isManagerOrAbove(role: Role): boolean {
  return role === "MANAGER" || role === "DEPARTMENT_HEAD" || role === "ADMIN";
}

/**
 * Check if user can view productivity scores
 */
export function canViewProductivity(role: Role): boolean {
  return isManagerOrAbove(role);
}
