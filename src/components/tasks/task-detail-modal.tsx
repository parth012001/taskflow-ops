"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TaskStatus, TaskPriority, TaskSize } from "@prisma/client";
import {
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  User,
  History,
  Send,
  X,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getStatusLabel,
  getStatusColor,
  getValidTransitions,
  transitionRequiresReason,
  TransitionContext,
} from "@/lib/utils/task-state-machine";
import { cn } from "@/lib/utils";

interface TaskOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  managerId?: string | null;
}

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  replies?: TaskComment[];
}

interface StatusHistoryItem {
  id: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  reason?: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface TaskDetail {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  size: TaskSize;
  estimatedMinutes: number;
  actualMinutes: number;
  deadline: string;
  startDate?: string | null;
  completedAt?: string | null;
  onHoldReason?: string | null;
  rejectionReason?: string | null;
  isCarriedForward: boolean;
  carryForwardCount: number;
  owner: TaskOwner;
  assigner?: { id: string; firstName: string; lastName: string } | null;
  kpiBucket: { id: string; name: string; description?: string | null };
  comments: TaskComment[];
  statusHistory: StatusHistoryItem[];
  _count: { comments: number; attachments: number };
}

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate?: () => void;
}

const priorityLabels: Record<TaskPriority, { label: string; color: string }> = {
  URGENT_IMPORTANT: { label: "P1 - Urgent & Important", color: "bg-red-500" },
  URGENT_NOT_IMPORTANT: { label: "P2 - Urgent", color: "bg-orange-500" },
  NOT_URGENT_IMPORTANT: { label: "P3 - Important", color: "bg-yellow-500" },
  NOT_URGENT_NOT_IMPORTANT: { label: "P4 - Low", color: "bg-gray-400" },
};

const sizeLabels: Record<TaskSize, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  DIFFICULT: "Difficult",
};

export function TaskDetailModal({
  taskId,
  open,
  onOpenChange,
  onTaskUpdate,
}: TaskDetailModalProps) {
  const { data: session } = useSession();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "history">("details");
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [transitionReason, setTransitionReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState<TaskStatus | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch task details
  useEffect(() => {
    if (!taskId || !open) {
      setTask(null);
      return;
    }

    const fetchTask = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        if (response.ok) {
          const data = await response.json();
          setTask(data);
        }
      } catch (error) {
        console.error("Error fetching task:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId, open]);

  // Get valid transitions for current user
  const getAvailableTransitions = (): TaskStatus[] => {
    if (!task || !session?.user) return [];

    const context: TransitionContext = {
      taskOwnerId: task.owner.id,
      currentUserId: session.user.id,
      currentUserRole: session.user.role,
      isManager: task.owner.managerId === session.user.id,
      reason: transitionReason,
      onHoldReason: transitionReason,
    };

    return getValidTransitions(task.status, context);
  };

  // Handle status transition
  const handleTransition = async (newStatus: TaskStatus) => {
    if (!task) return;

    // Check if reason is required
    if (transitionRequiresReason(task.status, newStatus) && !transitionReason) {
      setShowReasonInput(newStatus);
      return;
    }

    setIsTransitioning(true);
    try {
      const body: Record<string, string> = { toStatus: newStatus };
      if (newStatus === TaskStatus.ON_HOLD) {
        body.onHoldReason = transitionReason;
      } else if (newStatus === TaskStatus.REOPENED) {
        body.reason = transitionReason;
      }

      const response = await fetch(`/api/tasks/${task.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        // Refetch full task to get updated history
        const fullResponse = await fetch(`/api/tasks/${task.id}`);
        if (fullResponse.ok) {
          setTask(await fullResponse.json());
        }
        setTransitionReason("");
        setShowReasonInput(null);
        onTaskUpdate?.();
      } else {
        const error = await response.json();
        console.error("Transition failed:", error);
      }
    } catch (error) {
      console.error("Error transitioning task:", error);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!task || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        // Refetch task to get updated comments
        const taskResponse = await fetch(`/api/tasks/${task.id}`);
        if (taskResponse.ok) {
          setTask(await taskResponse.json());
        }
        setNewComment("");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        {isLoading || !task ? (
          <div className="flex items-center justify-center h-64">
            <DialogHeader className="sr-only">
              <DialogTitle>Loading task details</DialogTitle>
            </DialogHeader>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn(priorityLabels[task.priority].color, "text-white")}>
                      {priorityLabels[task.priority].label.split(" - ")[0]}
                    </Badge>
                    <Badge variant="outline">{sizeLabels[task.size]}</Badge>
                    <Badge variant="outline">{task.kpiBucket.name}</Badge>
                  </div>
                  <DialogTitle className="text-xl">{task.title}</DialogTitle>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-sm font-medium", getStatusColor(task.status).bg, getStatusColor(task.status).text)}>
                  {getStatusLabel(task.status)}
                </div>
              </div>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex border-b px-6">
              {(["details", "comments", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                    activeTab === tab
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "comments" && task._count.comments > 0 && (
                    <span className="ml-1 text-xs">({task._count.comments})</span>
                  )}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="p-6">
                {activeTab === "details" && (
                  <div className="space-y-6">
                    {/* Description */}
                    {task.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
                      </div>
                    )}

                    {/* Meta info grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Owner:</span>
                        <span className="font-medium">
                          {task.owner.firstName} {task.owner.lastName}
                        </span>
                      </div>

                      {task.assigner && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Assigned by:</span>
                          <span className="font-medium">
                            {task.assigner.firstName} {task.assigner.lastName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Deadline:</span>
                        <span className="font-medium">
                          {new Date(task.deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Estimated:</span>
                        <span className="font-medium">
                          {task.estimatedMinutes >= 60
                            ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60}m`
                            : `${task.estimatedMinutes}m`}
                        </span>
                      </div>

                      {task.actualMinutes > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Actual:</span>
                          <span className="font-medium">
                            {task.actualMinutes >= 60
                              ? `${Math.floor(task.actualMinutes / 60)}h ${task.actualMinutes % 60}m`
                              : `${task.actualMinutes}m`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* On Hold / Rejection Reason */}
                    {task.onHoldReason && task.status === TaskStatus.ON_HOLD && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-1">
                          <AlertCircle className="w-4 h-4" />
                          On Hold Reason
                        </div>
                        <p className="text-sm text-yellow-700">{task.onHoldReason}</p>
                      </div>
                    )}

                    {task.rejectionReason && task.status === TaskStatus.REOPENED && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
                          <AlertCircle className="w-4 h-4" />
                          Reopened Reason
                        </div>
                        <p className="text-sm text-red-700">{task.rejectionReason}</p>
                      </div>
                    )}

                    {/* Status Actions */}
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        {getAvailableTransitions().map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={status === TaskStatus.CLOSED_APPROVED ? "default" : "outline"}
                            onClick={() => handleTransition(status)}
                            disabled={isTransitioning}
                          >
                            <ChevronRight className="w-4 h-4 mr-1" />
                            {getStatusLabel(status)}
                          </Button>
                        ))}
                        {getAvailableTransitions().length === 0 && (
                          <p className="text-sm text-gray-500">No available actions</p>
                        )}
                      </div>

                      {/* Reason input for transitions */}
                      {showReasonInput && (
                        <div className="mt-4 space-y-2">
                          <Textarea
                            placeholder={
                              showReasonInput === TaskStatus.ON_HOLD
                                ? "Why is this task on hold? (min 10 characters)"
                                : "Reason for reopening (min 10 characters)"
                            }
                            value={transitionReason}
                            onChange={(e) => setTransitionReason(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleTransition(showReasonInput)}
                              disabled={transitionReason.length < 10 || isTransitioning}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowReasonInput(null);
                                setTransitionReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "comments" && (
                  <div className="space-y-4">
                    {/* Comment input */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1"
                        rows={2}
                      />
                      <Button
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Comments list */}
                    {task.comments.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No comments yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {task.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-indigo-600">
                                {comment.author.firstName[0]}
                                {comment.author.lastName[0]}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {comment.author.firstName} {comment.author.lastName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-4">
                    {task.statusHistory.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No history yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {task.statusHistory.map((item) => (
                          <div key={item.id} className="flex gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <History className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {item.changedBy.firstName} {item.changedBy.lastName}
                                </span>
                                <span className="text-gray-400">
                                  {item.fromStatus
                                    ? `changed status from ${getStatusLabel(item.fromStatus)} to ${getStatusLabel(item.toStatus)}`
                                    : `created task as ${getStatusLabel(item.toStatus)}`}
                                </span>
                              </div>
                              {item.reason && (
                                <p className="text-gray-600 mt-1">Reason: {item.reason}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
