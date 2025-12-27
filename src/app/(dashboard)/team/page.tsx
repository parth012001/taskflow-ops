"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getStatusLabel, getStatusColor } from "@/lib/utils/task-state-machine";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  taskStats: Record<string, number>;
  overdueCount: number;
  totalActive: number;
}

interface PendingTask {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  deadline: string;
  updatedAt: string;
  owner: { id: string; firstName: string; lastName: string };
  kpiBucket: { id: string; name: string };
}

const priorityColors: Record<TaskPriority, string> = {
  URGENT_IMPORTANT: "bg-red-500",
  URGENT_NOT_IMPORTANT: "bg-orange-500",
  NOT_URGENT_IMPORTANT: "bg-yellow-500",
  NOT_URGENT_NOT_IMPORTANT: "bg-gray-400",
};

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [summary, setSummary] = useState({ totalMembers: 0, totalPendingReview: 0, totalOverdue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Review dialog state
  const [reviewingTask, setReviewingTask] = useState<PendingTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user.role === Role.EMPLOYEE) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const fetchTeamData = useCallback(async () => {
    try {
      const response = await fetch("/api/team");
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
        setPendingTasks(data.pendingReviewTasks || []);
        setSummary(data.summary || { totalMembers: 0, totalPendingReview: 0, totalOverdue: 0 });
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session && session.user.role !== Role.EMPLOYEE) {
      fetchTeamData();
    }
  }, [session, fetchTeamData]);

  const handleApprove = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: TaskStatus.CLOSED_APPROVED }),
      });

      if (response.ok) {
        await fetchTeamData();
        setReviewingTask(null);
      }
    } catch (error) {
      console.error("Error approving task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (taskId: string) => {
    if (rejectionReason.length < 10) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStatus: TaskStatus.REOPENED,
          reason: rejectionReason,
        }),
      });

      if (response.ok) {
        await fetchTeamData();
        setReviewingTask(null);
        setRejectionReason("");
      }
    } catch (error) {
      console.error("Error rejecting task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
        <p className="text-sm text-gray-500">
          Monitor your team&apos;s progress and approve completed tasks
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.totalPendingReview > 0 ? "border-purple-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalPendingReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.totalOverdue > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.totalOverdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Active task breakdown by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No team members</p>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {member.totalActive} active
                        </span>
                        {member.taskStats.IN_PROGRESS > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {member.taskStats.IN_PROGRESS} in progress
                          </Badge>
                        )}
                        {member.overdueCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {member.overdueCount} overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
            <CardDescription>Tasks waiting for your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks pending review
                </p>
              ) : (
                pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg hover:border-purple-300 cursor-pointer"
                    onClick={() => setReviewingTask(task)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          priorityColors[task.priority]
                        )}
                      />
                      <span className="font-medium text-sm flex-1 truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        {task.owner.firstName} {task.owner.lastName}
                      </span>
                      <span>{task.kpiBucket.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewingTask} onOpenChange={() => setReviewingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Task</DialogTitle>
          </DialogHeader>

          {reviewingTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{reviewingTask.title}</h3>
                {reviewingTask.description && (
                  <p className="text-sm text-gray-600 mt-1">{reviewingTask.description}</p>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  By: {reviewingTask.owner.firstName} {reviewingTask.owner.lastName}
                </span>
                <span>KPI: {reviewingTask.kpiBucket.name}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Rejection Reason (if rejecting)
                </label>
                <Textarea
                  placeholder="Explain why this task needs more work (min 10 chars)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleReject(reviewingTask.id)}
                  disabled={rejectionReason.length < 10 || isSubmitting}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reopen
                </Button>
                <Button
                  onClick={() => handleApprove(reviewingTask.id)}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
