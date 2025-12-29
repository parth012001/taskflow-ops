"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { TaskStatus, TaskPriority, TaskSize } from "@prisma/client";
import {
  Sun,
  Moon,
  Plus,
  X,
  GripVertical,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CarryForwardModal } from "@/components/tasks/carry-forward-modal";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  size: TaskSize;
  estimatedMinutes: number;
  deadline: string;
  kpiBucket: { id: string; name: string };
}

interface SessionTask {
  id: string;
  orderIndex: number;
  wasCompleted: boolean;
  task: Task;
}

interface DailySession {
  id: string;
  sessionDate: string;
  morningCompleted: boolean;
  morningCompletedAt?: string | null;
  eveningCompleted: boolean;
  eveningCompletedAt?: string | null;
  morningNotes?: string | null;
  eveningNotes?: string | null;
  tasks: SessionTask[];
}

const priorityColors: Record<TaskPriority, string> = {
  URGENT_IMPORTANT: "bg-red-500",
  URGENT_NOT_IMPORTANT: "bg-orange-500",
  NOT_URGENT_IMPORTANT: "bg-yellow-500",
  NOT_URGENT_NOT_IMPORTANT: "bg-gray-400",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DailyPlanningPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planningSession, setPlanningSession] = useState<DailySession | null>(null);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [morningNotes, setMorningNotes] = useState("");
  const [eveningNotes, setEveningNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [carryForwardTask, setCarryForwardTask] = useState<Task | null>(null);

  const dateString = formatDate(selectedDate);
  const isToday = dateString === formatDate(new Date());

  // Fetch daily planning data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/daily-planning?date=${dateString}`);
      if (response.ok) {
        const data = await response.json();
        setPlanningSession(data.session);
        setAvailableTasks(data.availableTasks || []);
        setMorningNotes(data.session?.morningNotes || "");
        setEveningNotes(data.session?.eveningNotes || "");
      }
    } catch (error) {
      console.error("Error fetching daily planning:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateString]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  // Navigate dates
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Add task to plan
  const addTaskToPlan = async (taskId: string) => {
    const currentTaskIds = planningSession?.tasks.map((t) => t.task.id) || [];
    const newTaskIds = [...currentTaskIds, taskId];

    await updateSession({ taskIds: newTaskIds });
    setShowTaskPicker(false);
  };

  // Remove task from plan
  const removeTaskFromPlan = async (taskId: string) => {
    const newTaskIds = planningSession?.tasks
      .filter((t) => t.task.id !== taskId)
      .map((t) => t.task.id) || [];

    await updateSession({ taskIds: newTaskIds });
  };

  // Complete morning ritual
  const completeMorningRitual = async () => {
    await updateSession({ morningCompleted: true, morningNotes });
  };

  // Complete evening ritual
  const completeEveningRitual = async () => {
    await updateSession({ eveningCompleted: true, eveningNotes });
  };

  // Update session
  const updateSession = async (data: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/daily-planning?date=${dateString}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error updating session:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate totals
  const totalEstimatedMinutes = planningSession?.tasks.reduce(
    (sum, t) => sum + t.task.estimatedMinutes,
    0
  ) || 0;

  const totalHours = Math.floor(totalEstimatedMinutes / 60);
  const totalMinutes = totalEstimatedMinutes % 60;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Planning</h1>
          <p className="text-sm text-gray-500">
            Plan your day for maximum productivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={isToday ? "default" : "outline"}
            onClick={goToToday}
            className="min-w-[140px]"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {isToday ? "Today" : formatDate(selectedDate)}
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Date display */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {formatDisplayDate(selectedDate)}
              </h2>
              <p className="text-sm text-gray-500">
                {planningSession?.tasks.length || 0} tasks planned
                {totalEstimatedMinutes > 0 && (
                  <span className="ml-2">
                    ({totalHours > 0 && `${totalHours}h `}{totalMinutes}m estimated)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {planningSession?.morningCompleted && (
                <Badge className="bg-amber-100 text-amber-700">
                  <Sun className="w-3 h-3 mr-1" />
                  Morning done
                </Badge>
              )}
              {planningSession?.eveningCompleted && (
                <Badge className="bg-indigo-100 text-indigo-700">
                  <Moon className="w-3 h-3 mr-1" />
                  Evening done
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planned Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Planned Tasks</h3>
            <Button size="sm" onClick={() => setShowTaskPicker(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>

          {planningSession?.tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No tasks planned for this day</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowTaskPicker(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {planningSession?.tasks.map((sessionTask, index) => (
                <Card key={sessionTask.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          priorityColors[sessionTask.task.priority]
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {sessionTask.task.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {sessionTask.task.estimatedMinutes}m
                          </span>
                          <span>{sessionTask.task.kpiBucket.name}</span>
                        </div>
                      </div>
                      {/* Carry Forward button - show for overdue tasks (deadline before today) */}
                      {(() => {
                        const deadline = new Date(sessionTask.task.deadline);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return deadline < today;
                      })() &&
                        sessionTask.task.status !== TaskStatus.CLOSED_APPROVED && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => setCarryForwardTask(sessionTask.task)}
                            title="Carry forward to new deadline"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeTaskFromPlan(sessionTask.task.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Rituals */}
        <div className="space-y-4">
          {/* Morning Ritual */}
          <Card className={planningSession?.morningCompleted ? "border-amber-200 bg-amber-50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Morning Ritual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planningSession?.morningCompleted ? (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed at{" "}
                  {planningSession.morningCompletedAt &&
                    new Date(planningSession.morningCompletedAt).toLocaleTimeString()}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="What do you want to accomplish today?"
                    value={morningNotes}
                    onChange={(e) => setMorningNotes(e.target.value)}
                    rows={3}
                  />
                  <Button
                    className="w-full"
                    onClick={completeMorningRitual}
                    disabled={isSaving || !isToday}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Complete Morning Ritual
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evening Ritual */}
          <Card className={planningSession?.eveningCompleted ? "border-indigo-200 bg-indigo-50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-500" />
                Evening Ritual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planningSession?.eveningCompleted ? (
                <div className="flex items-center gap-2 text-sm text-indigo-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed at{" "}
                  {planningSession.eveningCompletedAt &&
                    new Date(planningSession.eveningCompletedAt).toLocaleTimeString()}
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="What did you accomplish? Any blockers?"
                    value={eveningNotes}
                    onChange={(e) => setEveningNotes(e.target.value)}
                    rows={3}
                  />
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={completeEveningRitual}
                    disabled={isSaving || !isToday || !planningSession?.morningCompleted}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Complete Evening Ritual
                  </Button>
                  {!planningSession?.morningCompleted && isToday && (
                    <p className="text-xs text-gray-500 text-center">
                      Complete morning ritual first
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Picker Dialog */}
      <Dialog open={showTaskPicker} onOpenChange={setShowTaskPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {availableTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No available tasks to add
              </p>
            ) : (
              availableTasks.map((task) => (
                <button
                  key={task.id}
                  className="w-full p-3 text-left rounded-lg border hover:bg-gray-50 transition-colors"
                  onClick={() => addTaskToPlan(task.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        priorityColors[task.priority]
                      )}
                    />
                    <span className="font-medium text-sm">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.estimatedMinutes}m
                    </span>
                    <span>{task.kpiBucket.name}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Carry Forward Modal */}
      {carryForwardTask && (
        <CarryForwardModal
          open={!!carryForwardTask}
          onOpenChange={(open) => !open && setCarryForwardTask(null)}
          taskId={carryForwardTask.id}
          taskTitle={carryForwardTask.title}
          currentDeadline={carryForwardTask.deadline}
          onSuccess={() => {
            setCarryForwardTask(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
