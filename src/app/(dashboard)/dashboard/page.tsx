"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Flame,
  Sun,
  X,
  BarChart3,
} from "lucide-react";
import { getStatusLabel } from "@/lib/utils/task-state-machine";
import { TaskStatus, RecognitionType } from "@prisma/client";
import { RecognitionWidget } from "@/components/gamification/recognition-widget";
import { AnnouncementsWidget } from "@/components/announcements/announcements-widget";
import { CompositeGauge } from "@/components/productivity/composite-gauge";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { Role } from "@prisma/client";

// Dynamic import for confetti (no SSR needed)
const ConfettiCelebration = dynamic(
  () => import("@/components/gamification/confetti-celebration").then((mod) => mod.ConfettiCelebration),
  { ssr: false }
);

interface Recognition {
  id: string;
  type: RecognitionType;
  awardedFor: string | null;
  awardedDate: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  author: string;
  createdAt: string;
  expiresAt: string | null;
}

interface DashboardStats {
  statusCounts: Record<TaskStatus, number>;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  pendingReviewCount: number;
  completionRate: number;
  kpiStats: { kpiBucketId: string; name: string; count: number }[];
  recentActivity: {
    id: string;
    taskId: string;
    taskTitle: string;
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    changedBy: string;
    createdAt: string;
  }[];
  streak: { current: number; longest: number; lastActive: string } | null;
  recognitions: Recognition[];
  announcements: Announcement[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMorningBanner, setShowMorningBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiType, setConfettiType] = useState<"task-completion" | "streak-milestone">("task-completion");
  const [productivityScore, setProductivityScore] = useState<{
    composite: number;
    output: number;
    quality: number;
    reliability: number;
    consistency: number;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchStats();

      // Fetch own productivity score
      fetch(`/api/productivity/scores/${session.user.id}`)
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data) {
            setProductivityScore({
              composite: data.composite,
              output: data.output,
              quality: data.quality,
              reliability: data.reliability,
              consistency: data.consistency,
            });
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Check morning ritual completion
  useEffect(() => {
    const checkMorningRitual = async () => {
      // Check if already dismissed for this session
      if (typeof window !== "undefined" && sessionStorage.getItem("morningBannerDismissed") === "true") {
        return;
      }

      try {
        const today = new Date().toISOString().split("T")[0];
        const response = await fetch(`/api/daily-planning?date=${today}`);
        if (response.ok) {
          const data = await response.json();
          // Show banner if morning ritual is not completed
          if (!data.session?.morningCompleted) {
            setShowMorningBanner(true);
          }
        }
      } catch (error) {
        console.error("Error checking morning ritual:", error);
      }
    };

    if (session) {
      checkMorningRitual();
    }
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const user = session.user;

  const dismissMorningBanner = () => {
    sessionStorage.setItem("morningBannerDismissed", "true");
    setShowMorningBanner(false);
  };

  const statCards = [
    {
      name: "In Progress",
      value: stats?.statusCounts.IN_PROGRESS || 0,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: "Pending Review",
      value: stats?.statusCounts.COMPLETED_PENDING_REVIEW || 0,
      icon: CheckSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      name: "Overdue",
      value: stats?.overdueCount || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      name: "Completed",
      value: stats?.completedTasks || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Morning Ritual Banner */}
      {showMorningBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800">
              Start your day right! Complete your morning planning ritual.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/daily-planning">
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Start Planning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={dismissMorningBanner} className="text-amber-600 hover:text-amber-700 hover:bg-amber-100">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user.firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your tasks today.
          </p>
        </div>
        {stats?.streak && stats.streak.current > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-700">
              {stats.streak.current} day streak!
            </span>
          </div>
        )}
      </div>

      {/* Announcements Widget */}
      {stats?.announcements && stats.announcements.length > 0 && (
        <AnnouncementsWidget announcements={stats.announcements} maxItems={3} />
      )}

      {/* Productivity Widget */}
      {productivityScore && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">My Productivity</h3>
            </div>
            <div className="flex items-center gap-6">
              <CompositeGauge score={productivityScore.composite} size={80} />
              <div className="flex-1 space-y-2">
                {([
                  { label: "Output", value: productivityScore.output, color: "bg-blue-500" },
                  { label: "Quality", value: productivityScore.quality, color: "bg-green-500" },
                  { label: "Reliability", value: productivityScore.reliability, color: "bg-purple-500" },
                  { label: "Consistency", value: productivityScore.consistency, color: "bg-amber-500" },
                ] as const).map((pillar) => (
                  <div key={pillar.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20">{pillar.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full">
                      <div
                        className={`h-2 rounded-full ${pillar.color}`}
                        style={{ width: `${Math.min(pillar.value, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-8 text-right">
                      {Math.round(pillar.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {isManagerOrAbove(user.role as Role) && (
              <Link href="/productivity">
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View Leaderboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? "-" : stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recognition Widget */}
      {stats?.recognitions && (
        <RecognitionWidget recognitions={stats.recognitions} />
      )}

      {/* Quick actions and today's summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily planning / Today's summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Today&apos;s Summary
            </CardTitle>
            <CardDescription>Your tasks for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {isLoading ? "-" : stats?.dueTodayCount || 0}
                  </p>
                  <p className="text-xs text-amber-700">Due Today</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {isLoading ? "-" : stats?.dueThisWeekCount || 0}
                  </p>
                  <p className="text-xs text-blue-700">This Week</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {isLoading ? "-" : stats?.completionRate || 0}%
                  </p>
                  <p className="text-xs text-green-700">Completion</p>
                </div>
              </div>

              <Link href="/tasks">
                <Button className="w-full" variant="outline">
                  Go to Tasks
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest status changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 4).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {activity.taskTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.fromStatus
                          ? `${getStatusLabel(activity.fromStatus)} → ${getStatusLabel(activity.toStatus)}`
                          : `Created as ${getStatusLabel(activity.toStatus)}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Overview */}
      {stats?.kpiStats && stats.kpiStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution by KPI</CardTitle>
            <CardDescription>
              Your tasks across different key performance areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.kpiStats.slice(0, 5).map((kpi, index) => {
                const colors = [
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-purple-500",
                  "bg-amber-500",
                  "bg-pink-500",
                ];
                const percentage = stats.totalTasks > 0
                  ? Math.round((kpi.count / stats.totalTasks) * 100)
                  : 0;

                return (
                  <div key={kpi.kpiBucketId} className="text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${percentage * 1.76} 176`}
                          className={colors[index % colors.length].replace("bg-", "text-")}
                        />
                      </svg>
                      <span className="absolute text-sm font-semibold">
                        {kpi.count}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 truncate" title={kpi.name}>
                      {kpi.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager-specific: Pending Reviews */}
      {user.role !== "EMPLOYEE" && stats?.pendingReviewCount && stats.pendingReviewCount > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">
                    {stats.pendingReviewCount} Tasks Pending Your Review
                  </h3>
                  <p className="text-sm text-purple-700">
                    Your team members are waiting for approval
                  </p>
                </div>
              </div>
              <Link href="/tasks?status=COMPLETED_PENDING_REVIEW">
                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                  Review Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confetti Celebration */}
      <ConfettiCelebration
        trigger={showConfetti}
        type={confettiType}
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
}
