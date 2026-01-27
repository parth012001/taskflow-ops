"use client";

import { TaskStatus, TaskPriority } from "@prisma/client";
import { X, ChevronDown, Calendar, Tag, Flag, Folder, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TaskFilters, DatePreset } from "@/hooks/use-task-filters";
import { getStatusLabel } from "@/lib/utils/task-state-machine";

interface KpiBucket {
  id: string;
  name: string;
}

export interface FilterAssignableUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface FilterBarProps {
  filters: TaskFilters;
  kpiBuckets: KpiBucket[];
  onStatusToggle: (status: TaskStatus) => void;
  onPriorityToggle: (priority: TaskPriority) => void;
  onKpiBucketChange: (id: string | null) => void;
  onDatePresetChange: (preset: DatePreset | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  assignableUsers?: FilterAssignableUser[];
  onOwnerToggle?: (id: string) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  URGENT_IMPORTANT: { label: "P1 - Urgent & Important", color: "bg-red-500" },
  URGENT_NOT_IMPORTANT: { label: "P2 - Urgent", color: "bg-orange-500" },
  NOT_URGENT_IMPORTANT: { label: "P3 - Important", color: "bg-yellow-500" },
  NOT_URGENT_NOT_IMPORTANT: { label: "P4 - Low Priority", color: "bg-gray-400" },
};

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
];

const ALL_STATUSES: TaskStatus[] = [
  TaskStatus.NEW,
  TaskStatus.ACCEPTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.ON_HOLD,
  TaskStatus.COMPLETED_PENDING_REVIEW,
  TaskStatus.REOPENED,
  TaskStatus.CLOSED_APPROVED,
];

const ALL_PRIORITIES: TaskPriority[] = [
  TaskPriority.URGENT_IMPORTANT,
  TaskPriority.URGENT_NOT_IMPORTANT,
  TaskPriority.NOT_URGENT_IMPORTANT,
  TaskPriority.NOT_URGENT_NOT_IMPORTANT,
];

export function FilterBar({
  filters,
  kpiBuckets,
  onStatusToggle,
  onPriorityToggle,
  onKpiBucketChange,
  onDatePresetChange,
  onClearFilters,
  hasActiveFilters,
  assignableUsers,
  onOwnerToggle,
}: FilterBarProps) {
  return (
    <div className="space-y-2">
      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1",
                filters.statuses.length > 0 && "bg-indigo-50 border-indigo-300"
              )}
            >
              <Tag className="w-4 h-4" />
              Status
              {filters.statuses.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs">
                  {filters.statuses.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {ALL_STATUSES.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={() => onStatusToggle(status)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm">{getStatusLabel(status)}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1",
                filters.priorities.length > 0 && "bg-indigo-50 border-indigo-300"
              )}
            >
              <Flag className="w-4 h-4" />
              Priority
              {filters.priorities.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs">
                  {filters.priorities.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1">
              {ALL_PRIORITIES.map((priority) => (
                <label
                  key={priority}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(priority)}
                    onChange={() => onPriorityToggle(priority)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      PRIORITY_CONFIG[priority].color
                    )}
                  />
                  <span className="text-sm">{PRIORITY_CONFIG[priority].label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* KPI Bucket Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1",
                filters.kpiBucketId && "bg-indigo-50 border-indigo-300"
              )}
            >
              <Folder className="w-4 h-4" />
              KPI Bucket
              {filters.kpiBucketId && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs">
                  1
                </span>
              )}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              <button
                onClick={() => onKpiBucketChange(null)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100",
                  !filters.kpiBucketId && "bg-indigo-50 text-indigo-700"
                )}
              >
                All Buckets
              </button>
              {kpiBuckets.map((bucket) => (
                <button
                  key={bucket.id}
                  onClick={() => onKpiBucketChange(bucket.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100",
                    filters.kpiBucketId === bucket.id && "bg-indigo-50 text-indigo-700"
                  )}
                >
                  {bucket.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1",
                filters.datePreset && "bg-indigo-50 border-indigo-300"
              )}
            >
              <Calendar className="w-4 h-4" />
              Due Date
              {filters.datePreset && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs">
                  1
                </span>
              )}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              <button
                onClick={() => onDatePresetChange(null)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100",
                  !filters.datePreset && "bg-indigo-50 text-indigo-700"
                )}
              >
                Any Date
              </button>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onDatePresetChange(preset.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100",
                    filters.datePreset === preset.id && "bg-indigo-50 text-indigo-700"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Team Member Filter */}
        {assignableUsers && assignableUsers.length > 0 && onOwnerToggle && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1",
                  filters.ownerIds.length > 0 && "bg-indigo-50 border-indigo-300"
                )}
              >
                <Users className="w-4 h-4" />
                Team Member
                {filters.ownerIds.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs">
                    {filters.ownerIds.length}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="max-h-60 overflow-y-auto space-y-1">
                {assignableUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.ownerIds.includes(user.id)}
                      onChange={() => onOwnerToggle(user.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{user.firstName} {user.lastName}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Chips */}
          {filters.statuses.map((status) => (
            <FilterChip
              key={status}
              label={getStatusLabel(status)}
              onRemove={() => onStatusToggle(status)}
            />
          ))}

          {/* Priority Chips */}
          {filters.priorities.map((priority) => (
            <FilterChip
              key={priority}
              label={PRIORITY_CONFIG[priority].label.split(" - ")[0]}
              onRemove={() => onPriorityToggle(priority)}
            />
          ))}

          {/* KPI Bucket Chip */}
          {filters.kpiBucketId && (
            <FilterChip
              label={kpiBuckets.find((b) => b.id === filters.kpiBucketId)?.name || "KPI Bucket"}
              onRemove={() => onKpiBucketChange(null)}
            />
          )}

          {/* Date Preset Chip */}
          {filters.datePreset && (
            <FilterChip
              label={DATE_PRESETS.find((p) => p.id === filters.datePreset)?.label || "Date Filter"}
              onRemove={() => onDatePresetChange(null)}
            />
          )}

          {/* Team Member Chips */}
          {assignableUsers && onOwnerToggle && filters.ownerIds.map((ownerId) => {
            const user = assignableUsers.find((u) => u.id === ownerId);
            return user ? (
              <FilterChip
                key={ownerId}
                label={`${user.firstName} ${user.lastName}`}
                onRemove={() => onOwnerToggle(ownerId)}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-indigo-200 rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
