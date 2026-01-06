"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KpiBucketsPanel } from "@/components/kpi-management/kpi-buckets-panel";
import { UserKpiPanel } from "@/components/kpi-management/user-kpi-panel";

type Tab = "buckets" | "assignments";

export default function KpiManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("buckets");

  // Redirect if not authorized (ADMIN only)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <Button
          variant="ghost"
          onClick={() => setActiveTab("buckets")}
          className={cn(
            "relative px-4 py-2",
            activeTab === "buckets"
              ? "text-purple-600 font-medium"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          KPI Buckets
          {activeTab === "buckets" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("assignments")}
          className={cn(
            "relative px-4 py-2",
            activeTab === "assignments"
              ? "text-purple-600 font-medium"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          User Assignments
          {activeTab === "assignments" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
          )}
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "buckets" ? <KpiBucketsPanel /> : <UserKpiPanel />}
    </div>
  );
}
