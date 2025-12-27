"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskStatus, TaskPriority, TaskSize } from "@prisma/client";
import { Calendar, Clock, MessageSquare, Paperclip, User } from "lucide-react";
import { getStatusColor } from "@/lib/utils/task-state-machine";
import { cn } from "@/lib/utils";

export interface TaskCardData {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  size: TaskSize;
  deadline: string | Date;
  estimatedMinutes: number;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  };
  kpiBucket: {
    id: string;
    name: string;
  };
  _count?: {
    comments: number;
    attachments: number;
  };
}

interface TaskCardProps {
  task: TaskCardData;
  onClick?: (task: TaskCardData) => void;
  isDragging?: boolean;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  URGENT_IMPORTANT: { label: "P1", color: "bg-red-500 text-white" },
  URGENT_NOT_IMPORTANT: { label: "P2", color: "bg-orange-500 text-white" },
  NOT_URGENT_IMPORTANT: { label: "P3", color: "bg-yellow-500 text-black" },
  NOT_URGENT_NOT_IMPORTANT: { label: "P4", color: "bg-gray-400 text-white" },
};

const sizeConfig: Record<TaskSize, { label: string; color: string }> = {
  EASY: { label: "S", color: "bg-green-100 text-green-700" },
  MEDIUM: { label: "M", color: "bg-blue-100 text-blue-700" },
  DIFFICULT: { label: "L", color: "bg-purple-100 text-purple-700" },
};

function formatDeadline(deadline: string | Date): { text: string; isOverdue: boolean; isDueSoon: boolean } {
  const date = new Date(deadline);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { text: `${Math.abs(days)}d overdue`, isOverdue: true, isDueSoon: false };
  } else if (days === 0) {
    return { text: "Due today", isOverdue: false, isDueSoon: true };
  } else if (days === 1) {
    return { text: "Due tomorrow", isOverdue: false, isDueSoon: true };
  } else if (days <= 3) {
    return { text: `${days}d left`, isOverdue: false, isDueSoon: true };
  } else {
    return {
      text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isOverdue: false,
      isDueSoon: false,
    };
  }
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];
  const size = sizeConfig[task.size];
  const deadline = formatDeadline(task.deadline);
  const statusColors = getStatusColor(task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing",
        "hover:shadow-md transition-shadow",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg",
        statusColors.border
      )}
      onClick={() => onClick?.(task)}
    >
      {/* Priority & Size Badges */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn("px-1.5 py-0.5 rounded text-xs font-semibold", priority.color)}>
          {priority.label}
        </span>
        <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", size.color)}>
          {size.label}
        </span>
        <span className="ml-auto text-xs text-gray-500 truncate max-w-[100px]">
          {task.kpiBucket.name}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {/* Deadline */}
        <div
          className={cn(
            "flex items-center gap-1",
            deadline.isOverdue && "text-red-600 font-medium",
            deadline.isDueSoon && !deadline.isOverdue && "text-orange-600"
          )}
        >
          <Calendar className="w-3 h-3" />
          <span>{deadline.text}</span>
        </div>

        {/* Estimated time */}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {task.estimatedMinutes >= 60
              ? `${Math.floor(task.estimatedMinutes / 60)}h`
              : `${task.estimatedMinutes}m`}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Comments & Attachments */}
        {task._count && task._count.comments > 0 && (
          <div className="flex items-center gap-0.5">
            <MessageSquare className="w-3 h-3" />
            <span>{task._count.comments}</span>
          </div>
        )}
        {task._count && task._count.attachments > 0 && (
          <div className="flex items-center gap-0.5">
            <Paperclip className="w-3 h-3" />
            <span>{task._count.attachments}</span>
          </div>
        )}
      </div>

      {/* Owner */}
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t">
        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
          <User className="w-3 h-3 text-indigo-600" />
        </div>
        <span className="text-xs text-gray-600">
          {task.owner.firstName} {task.owner.lastName}
        </span>
      </div>
    </div>
  );
}
