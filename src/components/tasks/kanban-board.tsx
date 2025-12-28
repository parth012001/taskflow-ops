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
import { TaskCard, TaskCardData } from "./task-card";

interface KanbanBoardProps {
  tasks: TaskCardData[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskClick?: (task: TaskCardData) => void;
  isLoading?: boolean;
}

// Define the display order of columns
const COLUMN_ORDER: TaskStatus[] = [
  TaskStatus.NEW,
  TaskStatus.ACCEPTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.ON_HOLD,
  TaskStatus.COMPLETED_PENDING_REVIEW,
  TaskStatus.REOPENED,
  TaskStatus.CLOSED_APPROVED,
];

// Define valid status transitions for drag-drop
// Note: ON_HOLD and REOPENED require reasons, so they can't be drag-drop targets
// Users must use the task detail modal for those transitions
const VALID_DROP_TARGETS: Record<TaskStatus, TaskStatus[]> = {
  NEW: [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS],
  ACCEPTED: [TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.COMPLETED_PENDING_REVIEW], // ON_HOLD requires reason
  ON_HOLD: [TaskStatus.IN_PROGRESS],
  COMPLETED_PENDING_REVIEW: [TaskStatus.CLOSED_APPROVED], // REOPENED requires reason
  REOPENED: [TaskStatus.IN_PROGRESS],
  CLOSED_APPROVED: [], // Terminal state
};

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, isLoading }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = tasks.filter((task) => task.status === status);
    return acc;
  }, {} as Record<TaskStatus, TaskCardData[]>);

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

      // Check if dropped on a column
      const newStatus = over.id as TaskStatus;
      if (!COLUMN_ORDER.includes(newStatus)) return;

      // Skip if same status
      if (task.status === newStatus) return;

      // Check if this is a valid transition
      const validTargets = VALID_DROP_TARGETS[task.status];
      if (!validTargets.includes(newStatus)) {
        console.warn(`Invalid transition from ${task.status} to ${newStatus}`);
        return;
      }

      // Perform the status change with error handling
      try {
        await onTaskMove(taskId, newStatus);
      } catch (error) {
        // Log for debugging - caller should handle user-facing errors
        console.error("Task move failed:", error);
      }
    },
    [tasks, onTaskMove]
  );

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((status) => (
          <div
            key={status}
            className="min-w-[280px] max-w-[320px] rounded-lg bg-gray-100 animate-pulse h-[400px]"
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
