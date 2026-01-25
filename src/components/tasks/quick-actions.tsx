"use client";

import { TaskStatus, Role } from "@prisma/client";
import { Play, CheckCircle, Pause, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: typeof Play;
  label: string;
  toStatus: TaskStatus;
  requiresReason: boolean;
  variant: "default" | "success" | "warning" | "danger";
}

interface QuickActionsProps {
  currentStatus: TaskStatus;
  userRole: Role;
  isOwner: boolean;
  isManager: boolean;
  onAction: (toStatus: TaskStatus, requiresReason: boolean) => void;
  className?: string;
}

function getQuickActions(
  status: TaskStatus,
  userRole: Role,
  isOwner: boolean,
  isManager: boolean
): QuickAction[] {
  const canApprove =
    isManager && ["MANAGER", "DEPARTMENT_HEAD", "ADMIN"].includes(userRole);

  switch (status) {
    case TaskStatus.NEW:
    case TaskStatus.ACCEPTED:
      if (!isOwner) return [];
      return [
        {
          icon: Play,
          label: "Start",
          toStatus: TaskStatus.IN_PROGRESS,
          requiresReason: false,
          variant: "default",
        },
      ];

    case TaskStatus.REOPENED:
      if (!isOwner) return [];
      return [
        {
          icon: Play,
          label: "Resume",
          toStatus: TaskStatus.IN_PROGRESS,
          requiresReason: false,
          variant: "default",
        },
      ];

    case TaskStatus.IN_PROGRESS:
      if (!isOwner) return [];
      return [
        {
          icon: CheckCircle,
          label: "Complete",
          toStatus: TaskStatus.COMPLETED_PENDING_REVIEW,
          requiresReason: false,
          variant: "success",
        },
        {
          icon: Pause,
          label: "Pause",
          toStatus: TaskStatus.ON_HOLD,
          requiresReason: true,
          variant: "warning",
        },
      ];

    case TaskStatus.ON_HOLD:
      if (!isOwner) return [];
      return [
        {
          icon: Play,
          label: "Resume",
          toStatus: TaskStatus.IN_PROGRESS,
          requiresReason: false,
          variant: "default",
        },
      ];

    case TaskStatus.COMPLETED_PENDING_REVIEW:
      if (!canApprove) return [];
      return [
        {
          icon: Check,
          label: "Approve",
          toStatus: TaskStatus.CLOSED_APPROVED,
          requiresReason: false,
          variant: "success",
        },
        {
          icon: RotateCcw,
          label: "Reject",
          toStatus: TaskStatus.REOPENED,
          requiresReason: true,
          variant: "danger",
        },
      ];

    case TaskStatus.CLOSED_APPROVED:
      return []; // Terminal state

    default:
      return [];
  }
}

const variantStyles: Record<QuickAction["variant"], string> = {
  default: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  success: "bg-green-100 hover:bg-green-200 text-green-700",
  warning: "bg-yellow-100 hover:bg-yellow-200 text-yellow-700",
  danger: "bg-red-100 hover:bg-red-200 text-red-700",
};

export function QuickActions({
  currentStatus,
  userRole,
  isOwner,
  isManager,
  onAction,
  className,
}: QuickActionsProps) {
  const actions = getQuickActions(currentStatus, userRole, isOwner, isManager);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()} // Prevent card click
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.toStatus}
            onClick={() => onAction(action.toStatus, action.requiresReason)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
              variantStyles[action.variant]
            )}
            title={action.label}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
