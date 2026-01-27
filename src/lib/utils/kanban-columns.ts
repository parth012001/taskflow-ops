import { TaskStatus } from "@prisma/client";

/**
 * Kanban column IDs for the 4-column consolidated view
 */
export type KanbanColumnId = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

/**
 * Configuration for each Kanban column
 */
export interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string;
  statuses: TaskStatus[];
  color: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * 4-column Kanban configuration
 * Maps multiple statuses to consolidated columns
 */
export const KANBAN_COLUMNS: Record<KanbanColumnId, KanbanColumnConfig> = {
  TODO: {
    id: "TODO",
    label: "To Do",
    statuses: [TaskStatus.NEW, TaskStatus.ACCEPTED, TaskStatus.REOPENED],
    color: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
    },
  },
  IN_PROGRESS: {
    id: "IN_PROGRESS",
    label: "In Progress",
    statuses: [TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD],
    color: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      border: "border-indigo-300",
    },
  },
  IN_REVIEW: {
    id: "IN_REVIEW",
    label: "In Review",
    statuses: [TaskStatus.COMPLETED_PENDING_REVIEW],
    color: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-300",
    },
  },
  DONE: {
    id: "DONE",
    label: "Done",
    statuses: [TaskStatus.CLOSED_APPROVED],
    color: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-300",
    },
  },
};

/**
 * Ordered list of column IDs for rendering
 */
export const COLUMN_ORDER: KanbanColumnId[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

/**
 * Get the column ID for a given task status
 */
export function getColumnForStatus(status: TaskStatus): KanbanColumnId {
  for (const [columnId, config] of Object.entries(KANBAN_COLUMNS)) {
    if (config.statuses.includes(status)) {
      return columnId as KanbanColumnId;
    }
  }
  // Default fallback (should never happen)
  return "TODO";
}

/**
 * Get the default status when dropping on a column
 * This is used when a task is dragged to a new column
 */
export function getDefaultStatusForColumn(columnId: KanbanColumnId): TaskStatus {
  switch (columnId) {
    case "TODO":
      return TaskStatus.NEW;
    case "IN_PROGRESS":
      return TaskStatus.IN_PROGRESS;
    case "IN_REVIEW":
      return TaskStatus.COMPLETED_PENDING_REVIEW;
    case "DONE":
      return TaskStatus.CLOSED_APPROVED;
  }
}

/**
 * Get the column configuration
 */
export function getColumnConfig(columnId: KanbanColumnId): KanbanColumnConfig {
  return KANBAN_COLUMNS[columnId];
}

/**
 * Check if a task status should show a special badge
 */
export function getStatusBadge(
  status: TaskStatus
): { label: string; variant: "warning" | "danger" } | null {
  switch (status) {
    case TaskStatus.ON_HOLD:
      return { label: "On Hold", variant: "warning" };
    case TaskStatus.REOPENED:
      return { label: "Reopened", variant: "danger" };
    default:
      return null;
  }
}

/**
 * Mapping of valid transitions for drag-drop within consolidated columns
 * Now includes ON_HOLD and REOPENED with reason requirement indication
 */
export interface DropTarget {
  status: TaskStatus;
  requiresReason: boolean;
}

/**
 * Get valid drop targets from a source status
 * Returns statuses that the task can transition to via drag-drop
 */
export function getValidDropTargets(fromStatus: TaskStatus, requiresReview: boolean = true): DropTarget[] {
  switch (fromStatus) {
    case TaskStatus.NEW:
      return [
        { status: TaskStatus.ACCEPTED, requiresReason: false },
        { status: TaskStatus.IN_PROGRESS, requiresReason: false },
      ];
    case TaskStatus.ACCEPTED:
      return [
        { status: TaskStatus.IN_PROGRESS, requiresReason: false },
      ];
    case TaskStatus.IN_PROGRESS:
      if (requiresReview) {
        return [
          { status: TaskStatus.ACCEPTED, requiresReason: false },
          { status: TaskStatus.ON_HOLD, requiresReason: true },
          { status: TaskStatus.COMPLETED_PENDING_REVIEW, requiresReason: false },
        ];
      }
      return [
        { status: TaskStatus.ACCEPTED, requiresReason: false },
        { status: TaskStatus.ON_HOLD, requiresReason: true },
        { status: TaskStatus.CLOSED_APPROVED, requiresReason: false },
      ];
    case TaskStatus.ON_HOLD:
      return [
        { status: TaskStatus.IN_PROGRESS, requiresReason: false },
      ];
    case TaskStatus.COMPLETED_PENDING_REVIEW:
      return [
        { status: TaskStatus.IN_PROGRESS, requiresReason: false },
        { status: TaskStatus.CLOSED_APPROVED, requiresReason: false },
        { status: TaskStatus.REOPENED, requiresReason: true },
      ];
    case TaskStatus.REOPENED:
      return [
        { status: TaskStatus.IN_PROGRESS, requiresReason: false },
      ];
    case TaskStatus.CLOSED_APPROVED:
      return [
        { status: TaskStatus.REOPENED, requiresReason: true },
      ];
    default:
      return [];
  }
}

/**
 * Check if a drop target is valid for a given source status
 */
export function isValidDropTarget(
  fromStatus: TaskStatus,
  toColumnId: KanbanColumnId,
  requiresReview: boolean = true
): boolean {
  const validTargets = getValidDropTargets(fromStatus, requiresReview);
  const columnStatuses = KANBAN_COLUMNS[toColumnId].statuses;

  return validTargets.some((target) => columnStatuses.includes(target.status));
}

/**
 * Get the target status when dropping on a column
 * Returns the appropriate status and whether reason is required
 */
export function getDropTargetStatus(
  fromStatus: TaskStatus,
  toColumnId: KanbanColumnId,
  requiresReview: boolean = true
): DropTarget | null {
  const validTargets = getValidDropTargets(fromStatus, requiresReview);
  const columnStatuses = KANBAN_COLUMNS[toColumnId].statuses;

  // Find the first valid target status that belongs to the destination column
  for (const target of validTargets) {
    if (columnStatuses.includes(target.status)) {
      return target;
    }
  }

  return null;
}
