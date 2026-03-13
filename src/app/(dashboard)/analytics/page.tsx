"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { canViewAnalytics } from "@/lib/utils/permissions";
import { authFetch } from "@/lib/auth-fetch";
import { Role } from "@prisma/client";
import { HealthScoreHero } from "@/components/analytics/health-score-hero";
import { AlertsPanel } from "@/components/analytics/alerts-panel";
import { CompanyTrendChart } from "@/components/analytics/company-trend-chart";
import { ScoreDistribution } from "@/components/analytics/score-distribution";
import { DepartmentComparison } from "@/components/analytics/department-comparison";

interface CompanyHealthData {
  companyScore: {
    composite: number;
    output: number;
    quality: number;
    reliability: number;
    consistency: number;
    band: string;
    change: number;
    scoredCount: number;
    totalEmployees: number;
  };
  distribution: {
    thriving: number;
    healthy: number;
    atRisk: number;
    critical: number;
  };
  alerts: {
    atRiskCount: number;
    biggestMover: { pillar: string; direction: string; delta: number } | null;
    unscorableCount: number;
  };
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [healthData, setHealthData] = useState<CompanyHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = (session?.user?.role as Role) || "EMPLOYEE";

  useEffect(() => {
    if (status === "authenticated" && !canViewAnalytics(userRole)) {
      router.push("/dashboard");
    }
  }, [status, userRole, router]);

  const fetchHealthData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authFetch("/api/analytics/company-health");
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      } else {
        setError(`Failed to load analytics (${response.status})`);
      }
    } catch (error) {
      console.error("Error fetching company health:", error);
      setError("Failed to connect to the server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && canViewAnalytics(userRole)) {
      fetchHealthData();
    }
  }, [status, userRole, fetchHealthData]);

  if (status === "loading" || (status === "authenticated" && !canViewAnalytics(userRole))) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Activity className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Health</h1>
          <p className="text-gray-500">Aggregated productivity metrics across the organization</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchHealthData}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Try again
          </button>
        </div>
      ) : !healthData ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-sm text-gray-500">No analytics data available</p>
        </div>
      ) : (
        <>
          {/* Health Score Hero */}
          <HealthScoreHero data={healthData.companyScore} />

          {/* Alerts Panel */}
          <AlertsPanel data={healthData.alerts} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompanyTrendChart />
            <ScoreDistribution data={healthData.distribution} />
          </div>

          {/* Department Comparison */}
          <DepartmentComparison />
        </>
      )}
    </div>
  );
}
