"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Trophy, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { isManagerOrAbove } from "@/lib/utils/permissions";
import { Role } from "@prisma/client";
import { ScoresPanel } from "@/components/productivity/scores-panel";
import { ScoringConfigPanel } from "@/components/productivity/scoring-config-panel";

type Tab = "leaderboard" | "config";

interface ProductivityStats {
  average: number;
  topScore: number;
  totalScored: number;
}

export default function ProductivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [stats, setStats] = useState<ProductivityStats>({
    average: 0,
    topScore: 0,
    totalScored: 0,
  });

  const userRole = (session?.user?.role as Role) || "EMPLOYEE";
  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    if (status === "authenticated" && !isManagerOrAbove(userRole)) {
      router.push("/dashboard");
    }
  }, [status, userRole, router]);

  if (
    status === "loading" ||
    (status === "authenticated" && !isManagerOrAbove(userRole))
  ) {
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
          <BarChart3 className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Productivity Scores
          </h1>
          <p className="text-gray-500">
            Track and compare team productivity metrics
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <p className="text-sm text-indigo-600 font-medium">Team Average</p>
          <p className="text-2xl font-bold text-indigo-700">{stats.average}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Top Score</p>
          <p className="text-2xl font-bold text-green-700">{stats.topScore}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Scored</p>
          <p className="text-2xl font-bold text-blue-700">{stats.totalScored}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Scoring Pillars</p>
          <p className="text-2xl font-bold text-purple-700">4</p>
        </div>
      </div>

      {/* Pill Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "leaderboard"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Trophy className="w-4 h-4" />
          Leaderboard
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("config")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "config"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <Settings className="w-4 h-4" />
            Scoring Config
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "leaderboard" ? (
        <ScoresPanel isAdmin={isAdmin} onStatsLoaded={setStats} />
      ) : (
        <ScoringConfigPanel />
      )}
    </div>
  );
}
