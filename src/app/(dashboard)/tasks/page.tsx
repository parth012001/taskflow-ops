"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TaskStatus } from "@prisma/client";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskCardData } from "@/components/tasks/task-card";
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskCardData | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");

      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

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

  useEffect(() => {
    fetchTasks();
    fetchKpiBuckets();
  }, [fetchTasks, fetchKpiBuckets]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchTasks]);

  // Handle task creation
  const handleCreateTask = async (data: CreateTaskInput) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create task");
    }

    await fetchTasks();
  };

  // Handle task status change (drag-drop)
  const handleTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: newStatus }),
      });

      if (!response.ok) {
        // Get error before reverting
        const error = await response.json();
        console.error("Transition failed:", error);
        // Revert on failure
        await fetchTasks();
        // Alert user
        alert(error.error || "Failed to update task status");
      }
    } catch (error) {
      await fetchTasks();
      console.error("Error transitioning task:", error);
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

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskClick={handleTaskClick}
        isLoading={isLoading}
      />

      {/* Create Task Form */}
      <CreateTaskForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={handleCreateTask}
        kpiBuckets={kpiBuckets}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTask?.id || null}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onTaskUpdate={fetchTasks}
      />
    </div>
  );
}
