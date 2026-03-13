"use client";

import { Badge } from "@/components/ui/badge";
import { CompositeGauge } from "@/components/productivity/composite-gauge";
import { PillarCard } from "@/components/productivity/pillar-card";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyScore {
  composite: number;
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
  band: string;
  change: number;
  scoredCount: number;
  totalEmployees: number;
}

interface HealthScoreHeroProps {
  data: CompanyScore;
}

const bandConfig: Record<string, { label: string; color: string }> = {
  thriving: { label: "Thriving", color: "bg-green-100 text-green-700 border-green-200" },
  healthy: { label: "Healthy", color: "bg-blue-100 text-blue-700 border-blue-200" },
  atRisk: { label: "At Risk", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200" },
};

export function HealthScoreHero({ data }: HealthScoreHeroProps) {
  const band = bandConfig[data.band] || bandConfig.healthy;

  return (
    <div className="space-y-4">
      {/* Top section: Gauge + Band + Change + Stats */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <CompositeGauge score={data.composite} size={160} />

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={band.color}>
                {band.label}
              </Badge>

              {data.change !== 0 && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    data.change > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {data.change > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {data.change > 0 ? "+" : ""}
                  {data.change}
                  <span className="text-gray-400 font-normal ml-1">vs last period</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>
                {data.scoredCount} of {data.totalEmployees} employees scored
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pillar cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PillarCard title="Output" score={data.output} color="blue" stats={[]} />
        <PillarCard title="Quality" score={data.quality} color="green" stats={[]} />
        <PillarCard title="Reliability" score={data.reliability} color="purple" stats={[]} />
        <PillarCard title="Consistency" score={data.consistency} color="amber" stats={[]} />
      </div>
    </div>
  );
}
