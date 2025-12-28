import { TaskStatus, Role } from "@prisma/client";

export interface TransitionContext {
  taskOwnerId: string;
  currentUserId: string;
  currentUserRole: Role;
  isManager: boolean; // Is current user the task owner's manager
  reason?: string;
  onHoldReason?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface StatusTransition {
  from: TaskStatus;
  to: TaskStatus;
  allowedRoles: Role[];
  requiresReason: boolean;
  requiresManagerApproval: boolean;
  validationFn?: (context: TransitionContext) => ValidationResult;
}

const transitions: StatusTransition[] = [
  // NEW -> ACCEPTED (Owner accepts assigned task)
  {
    from: TaskStatus.NEW,
    to: TaskStatus.ACCEPTED,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: false,
    validationFn: (ctx) => ({
      valid: ctx.taskOwnerId === ctx.currentUserId,
      error: "Only task owner can accept the task",
    }),
  },

  // ACCEPTED -> IN_PROGRESS
  {
    from: TaskStatus.ACCEPTED,
    to: TaskStatus.IN_PROGRESS,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: false,
    validationFn: (ctx) => ({
      valid: ctx.taskOwnerId === ctx.currentUserId,
      error: "Only task owner can start the task",
    }),
  },

  // NEW -> IN_PROGRESS (Skip accepted for self-assigned tasks)
  {
    from: TaskStatus.NEW,
    to: TaskStatus.IN_PROGRESS,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: false,
    validationFn: (ctx) => ({
      valid: ctx.taskOwnerId === ctx.currentUserId,
      error: "Only task owner can start the task",
    }),
  },

  // IN_PROGRESS -> ON_HOLD (Requires reason)
  {
    from: TaskStatus.IN_PROGRESS,
    to: TaskStatus.ON_HOLD,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: true,
    requiresManagerApproval: false,
    validationFn: (ctx) => {
      if (ctx.taskOwnerId !== ctx.currentUserId) {
        return { valid: false, error: "Only task owner can put task on hold" };
      }
      if (!ctx.onHoldReason || ctx.onHoldReason.trim().length < 10) {
        return {
          valid: false,
          error: "On-hold reason must be at least 10 characters",
        };
      }
      return { valid: true };
    },
  },

  // ON_HOLD -> IN_PROGRESS (Resume)
  {
    from: TaskStatus.ON_HOLD,
    to: TaskStatus.IN_PROGRESS,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: false,
    validationFn: (ctx) => ({
      valid: ctx.taskOwnerId === ctx.currentUserId,
      error: "Only task owner can resume the task",
    }),
  },

  // IN_PROGRESS -> COMPLETED_PENDING_REVIEW
  {
    from: TaskStatus.IN_PROGRESS,
    to: TaskStatus.COMPLETED_PENDING_REVIEW,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: false,
    validationFn: (ctx) => ({
      valid: ctx.taskOwnerId === ctx.currentUserId,
      error: "Only task owner can mark task for review",
    }),
  },

  // COMPLETED_PENDING_REVIEW -> CLOSED_APPROVED (Manager approval required)
  {
    from: TaskStatus.COMPLETED_PENDING_REVIEW,
    to: TaskStatus.CLOSED_APPROVED,
    allowedRoles: [Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: true,
    validationFn: (ctx) => {
      if (ctx.taskOwnerId === ctx.currentUserId) {
        return { valid: false, error: "Cannot approve your own task" };
      }
      if (!ctx.isManager && ctx.currentUserRole === Role.MANAGER) {
        return {
          valid: false,
          error: "Only the employee's manager can approve",
        };
      }
      return { valid: true };
    },
  },

  // COMPLETED_PENDING_REVIEW -> REOPENED (Manager rejects with reason)
  {
    from: TaskStatus.COMPLETED_PENDING_REVIEW,
    to: TaskStatus.REOPENED,
    allowedRoles: [Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: true,
    requiresManagerApproval: true,
    validationFn: (ctx) => {
      if (ctx.taskOwnerId === ctx.currentUserId) {
        return { valid: false, error: "Cannot reject your own task" };
      }
      if (!ctx.isManager && ctx.currentUserRole === Role.MANAGER) {
        return {
          valid: false,
          error: "Only the employee's manager can reject",
        };
      }
      if (!ctx.reason || ctx.reason.trim().length < 10) {
        return {
          valid: false,
          error: "Rejection reason must be at least 10 characters",
        };
      }
      return { valid: true };
    },
  },

  // REOPENED -> IN_PROGRESS (Owner resumes work)
  {
    from: TaskStatus.REOPENED,
    to: TaskStatus.IN_PROGRESS,
    allowedRoles: [Role.EMPLOYEE, Role.MANAGER, Role.DEPARTMENT_HEAD, Role.ADMIN],
    requiresReason: false,
    requiresManagerApproval: false,
    validationFn: (ctx) => ({
      valid: ctx.taskOwnerId === ctx.currentUserId,
      error: "Only task owner can resume reopened task",
    }),
  },
];

/**
 * Get all valid transitions from the current status for a given context
 */
export function getValidTransitions(
  currentStatus: TaskStatus,
  context: TransitionContext
): TaskStatus[] {
  return transitions
    .filter((t) => t.from === currentStatus)
    .filter((t) => t.allowedRoles.includes(context.currentUserRole))
    .filter((t) => !t.validationFn || t.validationFn(context).valid)
    .map((t) => t.to);
}

/**
 * Validate a specific status transition
 */
export function validateTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  context: TransitionContext
): ValidationResult {
  const transition = transitions.find(
    (t) => t.from === fromStatus && t.to === toStatus
  );

  if (!transition) {
    return {
      valid: false,
      error: `Invalid transition from ${fromStatus} to ${toStatus}`,
    };
  }

  if (!transition.allowedRoles.includes(context.currentUserRole)) {
    return {
      valid: false,
      error: `Role ${context.currentUserRole} cannot perform this transition`,
    };
  }

  if (transition.validationFn) {
    return transition.validationFn(context);
  }

  return { valid: true };
}

/**
 * Get the configuration for a specific transition
 */
export function getTransitionConfig(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): StatusTransition | undefined {
  return transitions.find((t) => t.from === fromStatus && t.to === toStatus);
}

/**
 * Check if a transition requires a reason
 */
export function transitionRequiresReason(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): boolean {
  const config = getTransitionConfig(fromStatus, toStatus);
  return config?.requiresReason ?? false;
}

/**
 * Check if a transition requires manager approval
 */
export function transitionRequiresManagerApproval(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): boolean {
  const config = getTransitionConfig(fromStatus, toStatus);
  return config?.requiresManagerApproval ?? false;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    NEW: "New",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In Progress",
    ON_HOLD: "On Hold",
    COMPLETED_PENDING_REVIEW: "Pending Review",
    CLOSED_APPROVED: "Completed",
    REOPENED: "Reopened",
  };
  return labels[status];
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: TaskStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<
    TaskStatus,
    { bg: string; text: string; border: string }
  > = {
    NEW: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
    ACCEPTED: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-300",
    },
    IN_PROGRESS: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      border: "border-indigo-300",
    },
    ON_HOLD: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-300",
    },
    COMPLETED_PENDING_REVIEW: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-300",
    },
    CLOSED_APPROVED: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-300",
    },
    REOPENED: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-300",
    },
  };
  return colors[status];
}
