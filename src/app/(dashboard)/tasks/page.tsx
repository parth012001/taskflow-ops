"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { TaskStatus, Role } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { CreateTaskForm, AssignableUser, ReviewerUser } from "@/components/tasks/create-task-form";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskCardData, QuickActionContext } from "@/components/tasks/task-card";
import { ViewTabs, ViewMode } from "@/components/tasks/view-tabs";
import { FilterBar } from "@/components/tasks/filter-bar";
import { ReviewQueueBanner } from "@/components/tasks/review-queue-banner";
import { useTaskFilters } from "@/hooks/use-task-filters";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { CreateTaskInput } from "@/lib/validations/task";

interface KpiBucket {
  id: string;
  name: string;
  description?: string | null;
}

export default function TasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskCardData[]>([]);
  const [kpiBuckets, setKpiBuckets] = useState<KpiBucket[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [availableReviewers, setAvailableReviewers] = useState<ReviewerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("my");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskCardData | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const isInitialMount = useRef(true);

  const userRole = session?.user?.role as Role | undefined;
  const userId = session?.user?.id;
  const showReviewBanner = userRole && isManagerOrAbove(userRole);

  // Quick action context for task cards
  const quickActionContext: QuickActionContext | undefined =
    userId && userRole
      ? {
          currentUserId: userId,
          currentUserRole: userRole,
          isManagerOfOwner: isManagerOrAbove(userRole), // Simplified: managers can approve team tasks
        }
      : undefined;

  // Filter state
  const {
    filters,
    setStatuses,
    toggleStatus,
    togglePriority,
    setKpiBucketId,
    setDatePreset,
    clearFilters,
    hasActiveFilters,
    toQueryParams,
  } = useTaskFilters();

  // Fetch tasks - accepts optional search param to avoid stale closure
  const fetchTasks = useCallback(async (search?: string, view?: ViewMode, filterParams?: URLSearchParams) => {
    try {
      const params = filterParams ?? toQueryParams();
      if (search) params.set("search", search);

      // Apply view mode filter
      const currentView = view ?? viewMode;
      if (currentView === "my" && session?.user?.id) {
        params.set("ownerId", session.user.id);
      }
      // 'team' and 'all' views - API handles based on user role

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, session?.user?.id, toQueryParams]);

  // Fetch KPI buckets
  const fetchKpiBuckets = useCallback(async () => {
    try {
      const response = await fetch("/api/kpi-buckets");
      if (!response.ok) throw new Error("Failed to fetch KPI buckets");

      const data = await response.json();
      setKpiBuckets(data);
    } catch (error) {
      console.error("Error fetching KPI buckets:", error);
    }
  }, []);

  // Fetch assignable users (for managers+ to assign tasks)
  const fetchAssignableUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks/assignees");
      if (!response.ok) throw new Error("Failed to fetch assignable users");

      const data = await response.json();
      setAssignableUsers(data);
    } catch (error) {
      console.error("Error fetching assignable users:", error);
    }
  }, []);

  // Fetch available reviewers (for managers to pick a reviewer)
  const fetchAvailableReviewers = useCallback(async () => {
    if (userRole !== "MANAGER") return;

    try {
      const response = await fetch("/api/tasks/reviewers");
      if (!response.ok) return;

      const data = await response.json();
      setAvailableReviewers(data);
    } catch (error) {
      console.error("Error fetching reviewers:", error);
    }
  }, [userRole]);

  // Fetch pending review count for managers+
  const fetchPendingReviewCount = useCallback(async () => {
    if (!showReviewBanner) return;

    try {
      const params = new URLSearchParams();
      params.set("status", TaskStatus.COMPLETED_PENDING_REVIEW);

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) return;

      const data = await response.json();
      setPendingReviewCount(data.tasks?.length || 0);
    } catch (error) {
      console.error("Error fetching pending review count:", error);
    }
  }, [showReviewBanner]);

  // Initial load - runs once on mount
  useEffect(() => {
    fetchTasks();
    fetchKpiBuckets();
    fetchAssignableUsers();
    fetchAvailableReviewers();
    fetchPendingReviewCount();
  }, [fetchTasks, fetchKpiBuckets, fetchAssignableUsers, fetchAvailableReviewers, fetchPendingReviewCount]);

  // Debounced search - only runs on search query changes, not initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      fetchTasks(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchTasks]);

  // Handle view mode changes
  const handleViewChange = useCallback((view: ViewMode) => {
    setViewMode(view);
    setIsLoading(true);
    fetchTasks(searchQuery, view);
  }, [fetchTasks, searchQuery]);

  // Refetch when filters change
  useEffect(() => {
    if (isInitialMount.current) return;
    fetchTasks(searchQuery);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle review banner click - filter to pending review tasks
  const handleViewPendingReviews = useCallback(() => {
    // Switch to team view and filter to pending review status
    if (viewMode === "my") {
      setViewMode("team");
    }
    setStatuses([TaskStatus.COMPLETED_PENDING_REVIEW]);
  }, [viewMode, setStatuses]);

  // Handle task creation
  const handleCreateTask = async (data: CreateTaskInput) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error("Failed to create task", {
        description: error.error || "Please check your input and try again",
      });
      throw new Error(error.error || "Failed to create task");
    }

    await fetchTasks(searchQuery);
    toast.success("Task created", {
      description: "Your new task has been added to the board",
    });
  };

  // Handle task status change (drag-drop)
  const handleTaskMove = async (taskId: string, newStatus: TaskStatus, reason?: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    try {
      // Build request body with optional reason
      const body: Record<string, string> = { toStatus: newStatus };
      if (newStatus === TaskStatus.ON_HOLD && reason) {
        body.onHoldReason = reason;
      } else if (newStatus === TaskStatus.REOPENED && reason) {
        body.reason = reason;
      }

      const response = await fetch(`/api/tasks/${taskId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Get error before reverting
        const error = await response.json();
        // Revert on failure
        await fetchTasks(searchQuery);
        // Show toast notification
        toast.error("Failed to update task", {
          description: error.error || "Please try again or use the task detail view",
        });
      }
    } catch (error) {
      await fetchTasks(searchQuery);
      toast.error("Connection error", {
        description: "Failed to connect to server. Please try again.",
      });
    }
  };

  // Handle task click
  const handleTaskClick = (task: TaskCardData) => {
    setSelectedTask(task);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">
            Manage and track your tasks across all stages
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* View Tabs */}
      {userRole && (
        <ViewTabs
          role={userRole}
          activeView={viewMode}
          onViewChange={handleViewChange}
        />
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        kpiBuckets={kpiBuckets}
        onStatusToggle={toggleStatus}
        onPriorityToggle={togglePriority}
        onKpiBucketChange={setKpiBucketId}
        onDatePresetChange={setDatePreset}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Review Queue Banner (Managers+) */}
      {showReviewBanner && (
        <ReviewQueueBanner
          pendingCount={pendingReviewCount}
          onViewClick={handleViewPendingReviews}
        />
      )}

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskClick={handleTaskClick}
        isLoading={isLoading}
        quickActionContext={quickActionContext}
      />

      {/* Create Task Form */}
      <CreateTaskForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={handleCreateTask}
        kpiBuckets={kpiBuckets}
        assignableUsers={assignableUsers}
        currentUserRole={userRole}
        availableReviewers={availableReviewers}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTask?.id || null}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdate={() => fetchTasks(searchQuery)}
      />
    </div>
  );
}
