"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TaskCard, TaskCardData, QuickActionContext } from "./task-card";
import { cn } from "@/lib/utils";
import { KanbanColumnId, getColumnConfig } from "@/lib/utils/kanban-columns";
import { TaskStatus } from "@prisma/client";

const COLLAPSED_STORAGE_KEY = "kanban-done-collapsed";

interface KanbanColumnProps {
  columnId: KanbanColumnId;
  tasks: TaskCardData[];
  onTaskClick?: (task: TaskCardData) => void;
  quickActionContext?: QuickActionContext;
  onQuickAction?: (taskId: string, toStatus: TaskStatus, requiresReason: boolean) => void;
}

export function KanbanColumn({
  columnId,
  tasks,
  onTaskClick,
  quickActionContext,
  onQuickAction,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  const config = getColumnConfig(columnId);
  const { label, color } = config;

  // Collapsible state for Done column (persisted to localStorage)
  const canCollapse = columnId === "DONE";
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (canCollapse && typeof window !== "undefined") {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    }
    return false;
  });

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(newState));
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg",
        "bg-gray-50 border border-gray-200",
        isCollapsed ? "min-w-[100px] max-w-[100px]" : "min-w-[280px] max-w-[320px]"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "px-3 py-2 border-b flex items-center gap-2",
          color.bg,
          canCollapse && "cursor-pointer hover:opacity-90"
        )}
        onClick={canCollapse ? toggleCollapsed : undefined}
      >
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", color.text.replace("text-", "bg-"))} />
        <h3 className={cn("font-medium text-sm", color.text, isCollapsed && "sr-only")}>{label}</h3>
        <span className={cn("text-xs px-2 py-0.5 rounded-full", color.bg, color.text, !isCollapsed && "ml-auto")}>
          {tasks.length}
        </span>
        {canCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className={cn("p-0.5 rounded hover:bg-black/10", !isCollapsed && "ml-1")}
            aria-label={isCollapsed ? "Expand column" : "Collapse column"}
          >
            {isCollapsed ? (
              <ChevronDown className={cn("w-4 h-4", color.text)} />
            ) : (
              <ChevronUp className={cn("w-4 h-4", color.text)} />
            )}
          </button>
        )}
      </div>

      {/* Tasks List (hidden when collapsed) */}
      {!isCollapsed && (
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
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={onTaskClick}
                  quickActionContext={quickActionContext}
                  onQuickAction={onQuickAction}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}

      {/* Collapsed Drop Zone */}
      {isCollapsed && (
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-2 min-h-[200px]",
            isOver && "bg-indigo-50 ring-2 ring-indigo-300 ring-inset rounded-b-lg"
          )}
        />
      )}
    </div>
  );
}
