"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CompositeGauge } from "./composite-gauge";
import { PillarCard } from "./pillar-card";
import { TrendChart } from "./trend-chart";
import type { ProductivityResult } from "@/lib/productivity/scoring-engine";

const roleLabels: Record<string, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Dept Head",
  ADMIN: "Admin",
};

const roleBadgeColors: Record<string, string> = {
  EMPLOYEE: "bg-gray-100 text-gray-700 border-gray-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  DEPARTMENT_HEAD: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-red-100 text-red-700 border-red-200",
};

interface ScorecardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string;
  userDepartment: string | null;
}

export function ScorecardDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userRole,
  userDepartment,
}: ScorecardDialogProps) {
  const [result, setResult] = useState<ProductivityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScore = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(`/api/productivity/scores/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      console.error("Error fetching score:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setResult(null);
      fetchScore();
    }
  }, [open, fetchScore]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {userName}
            <Badge variant="outline" className={roleBadgeColors[userRole] || ""}>
              {roleLabels[userRole] || userRole}
            </Badge>
            {userDepartment && (
              <span className="text-sm font-normal text-gray-500">
                {userDepartment}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Score Overview */}
            <div className="flex items-center gap-6">
              <CompositeGauge score={result.composite} />
              <div>
                <p className="text-sm text-gray-500">Composite Score</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(result.composite)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Based on {result.meta.completedTaskCount} tasks in the last 28 days
                </p>
              </div>
            </div>

            {/* Pillar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PillarCard
                title="Output"
                score={result.output}
                color="blue"
                stats={[
                  { label: "Points", value: `${result.meta.totalPoints}/${result.meta.targetPoints} pts` },
                  { label: "Completed", value: `${result.meta.completedTaskCount} tasks` },
                ]}
              />
              <PillarCard
                title="Quality"
                score={result.quality}
                color="green"
                stats={[
                  { label: "First-pass", value: `${result.meta.firstPassCount}/${result.meta.reviewedTaskCount}` },
                  { label: "Review ratio", value: `${Math.round(result.meta.reviewRatio * 100)}%` },
                ]}
              />
              <PillarCard
                title="Reliability"
                score={result.reliability}
                color="purple"
                stats={[
                  { label: "On-time", value: `${result.meta.onTimeCount}/${result.meta.totalWithDeadline}` },
                  { label: "Carry-forwards", value: `${result.meta.carryForwardTotal}` },
                ]}
              />
              <PillarCard
                title="Consistency"
                score={result.consistency}
                color="amber"
                stats={[
                  { label: "Planned days", value: `${result.meta.plannedDays}/${result.meta.totalWorkdays}` },
                  { label: "KPI spread", value: `${result.meta.activeKpiBuckets}/${result.meta.assignedKpiBuckets}` },
                ]}
              />
            </div>

            {/* Trend Chart */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Score Trends</h3>
              <TrendChart userId={userId} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-gray-500">
            Unable to load score data
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
