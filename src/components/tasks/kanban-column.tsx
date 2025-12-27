"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskStatus } from "@prisma/client";
import { getStatusLabel, getStatusColor } from "@/lib/utils/task-state-machine";
import { TaskCard, TaskCardData } from "./task-card";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskCardData[];
  onTaskClick?: (task: TaskCardData) => void;
}

export function KanbanColumn({ status, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const colors = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] rounded-lg",
        "bg-gray-50 border border-gray-200"
      )}
    >
      {/* Column Header */}
      <div className={cn("px-3 py-2 border-b flex items-center gap-2", colors.bg)}>
        <div className={cn("w-2 h-2 rounded-full", colors.text.replace("text-", "bg-"))} />
        <h3 className={cn("font-medium text-sm", colors.text)}>{label}</h3>
        <span className={cn("ml-auto text-xs px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks List */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-250px)]",
          isOver && "bg-indigo-50 ring-2 ring-indigo-300 ring-inset rounded-b-lg"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-gray-400">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
