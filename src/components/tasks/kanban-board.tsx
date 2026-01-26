"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { TaskStatus } from "@prisma/client";
import { KanbanColumn } from "./kanban-column";
import { TaskCard, TaskCardData, QuickActionContext } from "./task-card";
import { TransitionReasonModal } from "./transition-reason-modal";
import {
  COLUMN_ORDER,
  KANBAN_COLUMNS,
  KanbanColumnId,
  getColumnForStatus,
  getDropTargetStatus,
  isValidDropTarget,
} from "@/lib/utils/kanban-columns";

interface KanbanBoardProps {
  tasks: TaskCardData[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus, reason?: string) => Promise<void>;
  onTaskClick?: (task: TaskCardData) => void;
  isLoading?: boolean;
  quickActionContext?: QuickActionContext;
}

interface PendingTransition {
  taskId: string;
  taskTitle: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, isLoading, quickActionContext }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by column (each column can have multiple statuses)
  const tasksByColumn = COLUMN_ORDER.reduce((acc, columnId) => {
    const columnStatuses = KANBAN_COLUMNS[columnId].statuses;
    acc[columnId] = tasks.filter((task) => columnStatuses.includes(task.status));
    return acc;
  }, {} as Record<KanbanColumnId, TaskCardData[]>);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || !onTaskMove) return;

      const taskId = active.id as string;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Determine target column - could be a column ID or a task ID
      let targetColumnId: KanbanColumnId;
      if (COLUMN_ORDER.includes(over.id as KanbanColumnId)) {
        // Dropped directly on a column
        targetColumnId = over.id as KanbanColumnId;
      } else {
        // Dropped on a task card - find which column that task belongs to
        const overTask = tasks.find((t) => t.id === over.id);
        if (!overTask) return;
        targetColumnId = getColumnForStatus(overTask.status);
      }

      // Skip if same column
      const currentColumnId = getColumnForStatus(task.status);
      if (currentColumnId === targetColumnId) return;

      // Check if this is a valid transition
      if (!isValidDropTarget(task.status, targetColumnId, task.requiresReview)) {
        console.warn(`Invalid transition from ${task.status} to column ${targetColumnId}`);
        return;
      }

      // Get the target status for this column
      const dropTarget = getDropTargetStatus(task.status, targetColumnId, task.requiresReview);
      if (!dropTarget) return;

      // If transition requires a reason, show the modal
      if (dropTarget.requiresReason) {
        setPendingTransition({
          taskId,
          taskTitle: task.title,
          fromStatus: task.status,
          toStatus: dropTarget.status,
        });
        return;
      }

      // Perform the status change with error handling
      try {
        await onTaskMove(taskId, dropTarget.status);
      } catch (error) {
        // Log for debugging - caller should handle user-facing errors
        console.error("Task move failed:", error);
      }
    },
    [tasks, onTaskMove]
  );

  const handleTransitionConfirm = useCallback(
    async (reason: string) => {
      if (!pendingTransition || !onTaskMove) return;

      try {
        await onTaskMove(pendingTransition.taskId, pendingTransition.toStatus, reason);
      } catch (error) {
        console.error("Task move failed:", error);
      } finally {
        setPendingTransition(null);
      }
    },
    [pendingTransition, onTaskMove]
  );

  const handleTransitionCancel = useCallback(() => {
    setPendingTransition(null);
  }, []);

  // Handle quick action from task card
  const handleQuickAction = useCallback(
    async (taskId: string, toStatus: TaskStatus, requiresReason: boolean) => {
      if (!onTaskMove) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (requiresReason) {
        setPendingTransition({
          taskId,
          taskTitle: task.title,
          fromStatus: task.status,
          toStatus,
        });
        return;
      }

      try {
        await onTaskMove(taskId, toStatus);
      } catch (error) {
        console.error("Task move failed:", error);
      }
    },
    [tasks, onTaskMove]
  );

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((columnId) => (
          <div
            key={columnId}
            className="min-w-[280px] max-w-[320px] rounded-lg bg-gray-100 animate-pulse h-[400px]"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((columnId) => (
            <KanbanColumn
              key={columnId}
              columnId={columnId}
              tasks={tasksByColumn[columnId] || []}
              onTaskClick={onTaskClick}
              quickActionContext={quickActionContext}
              onQuickAction={handleQuickAction}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Transition Reason Modal */}
      <TransitionReasonModal
        open={!!pendingTransition}
        onOpenChange={(open) => !open && handleTransitionCancel()}
        taskTitle={pendingTransition?.taskTitle || ""}
        toStatus={pendingTransition?.toStatus || TaskStatus.ON_HOLD}
        onConfirm={handleTransitionConfirm}
        onCancel={handleTransitionCancel}
      />
    </>
  );
}
