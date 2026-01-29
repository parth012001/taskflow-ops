"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PieChart, Boxes, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiBucketsPanel } from "@/components/kpi-management/kpi-buckets-panel";
import { UserKpiPanel } from "@/components/kpi-management/user-kpi-panel";

type Tab = "buckets" | "assignments";

interface KpiStats {
  totalBuckets: number;
  totalAssignments: number;
  usersWithKpis: number;
  unassignedUsers: number;
}

export default function KpiManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("buckets");
  const [stats, setStats] = useState<KpiStats>({
    totalBuckets: 0,
    totalAssignments: 0,
    usersWithKpis: 0,
    unassignedUsers: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const [bucketsRes, usersRes] = await Promise.all([
        fetch("/api/kpi-management/buckets"),
        fetch("/api/kpi-management/users"),
      ]);

      if (bucketsRes.ok && usersRes.ok) {
        const bucketsData = await bucketsRes.json();
        const usersData = await usersRes.json();

        const activeBuckets = bucketsData.kpiBuckets.filter((b: { isActive: boolean }) => b.isActive);
        const totalAssignments = activeBuckets.reduce(
          (sum: number, b: { _count: { userKpis: number } }) => sum + b._count.userKpis,
          0
        );
        const usersWithKpis = usersData.users.filter(
          (u: { assignedKpis: unknown[] }) => u.assignedKpis.length > 0
        ).length;
        const unassignedUsers = usersData.users.filter(
          (u: { assignedKpis: unknown[] }) => u.assignedKpis.length === 0
        ).length;

        setStats({
          totalBuckets: activeBuckets.length,
          totalAssignments,
          usersWithKpis,
          unassignedUsers,
        });
      }
    } catch (error) {
      console.error("Error fetching KPI stats:", error);
    }
  }, []);

  // Redirect if not authorized (ADMIN only)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchStats();
    }
  }, [status, session, fetchStats]);

  // Show loading state while checking auth or if not authorized
  if (status === "loading" || (status === "authenticated" && session?.user?.role !== "ADMIN")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <PieChart className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Management</h1>
          <p className="text-gray-500">
            Create KPI buckets and assign them to users
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Total KPI Buckets</p>
          <p className="text-2xl font-bold text-purple-700">{stats.totalBuckets}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Assignments</p>
          <p className="text-2xl font-bold text-blue-700">{stats.totalAssignments}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Users with KPIs</p>
          <p className="text-2xl font-bold text-green-700">{stats.usersWithKpis}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium">Unassigned Users</p>
          <p className="text-2xl font-bold text-amber-700">{stats.unassignedUsers}</p>
        </div>
      </div>

      {/* Enhanced Pill-Style Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("buckets")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "buckets"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Boxes className="w-4 h-4" />
          KPI Buckets
          <span className={cn(
            "ml-1 px-2 py-0.5 rounded-full text-xs",
            activeTab === "buckets"
              ? "bg-purple-100 text-purple-600"
              : "bg-gray-200 text-gray-600"
          )}>
            {stats.totalBuckets}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "assignments"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" />
          User Assignments
          <span className={cn(
            "ml-1 px-2 py-0.5 rounded-full text-xs",
            activeTab === "assignments"
              ? "bg-purple-100 text-purple-600"
              : "bg-gray-200 text-gray-600"
          )}>
            {stats.usersWithKpis + stats.unassignedUsers}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "buckets" ? (
        <KpiBucketsPanel onDataChange={fetchStats} />
      ) : (
        <UserKpiPanel onDataChange={fetchStats} />
      )}
    </div>
  );
}
