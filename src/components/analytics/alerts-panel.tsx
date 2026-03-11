"use client";

import { AlertTriangle, TrendingUp, TrendingDown, UserMinus } from "lucide-react";

interface AlertsData {
  atRiskCount: number;
  biggestMover: { pillar: string; direction: string; delta: number } | null;
  unscorableCount: number;
}

interface AlertsPanelProps {
  data: AlertsData;
}

export function AlertsPanel({ data }: AlertsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* At Risk */}
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm text-amber-600 font-medium">At Risk</p>
          <p className="text-2xl font-bold text-amber-700">{data.atRiskCount}</p>
          <p className="text-xs text-amber-500">employees below threshold</p>
        </div>
      </div>

      {/* Biggest Mover */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
          {data.biggestMover ? (
            data.biggestMover.direction === "up" ? (
              <TrendingUp className="h-5 w-5 text-blue-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-blue-600" />
            )
          ) : (
            <TrendingUp className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div>
          <p className="text-sm text-blue-600 font-medium">Biggest Mover</p>
          {data.biggestMover ? (
            <>
              <p className="text-2xl font-bold text-blue-700">
                {data.biggestMover.direction === "up" ? "+" : "-"}{data.biggestMover.delta}
              </p>
              <p className="text-xs text-blue-500 capitalize">{data.biggestMover.pillar}</p>
            </>
          ) : (
            <p className="text-sm text-blue-500">No data yet</p>
          )}
        </div>
      </div>

      {/* Unscorable */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
        <div className="p-2 bg-gray-100 rounded-lg shrink-0">
          <UserMinus className="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <p className="text-sm text-gray-600 font-medium">Unscorable</p>
          <p className="text-2xl font-bold text-gray-700">{data.unscorableCount}</p>
          <p className="text-xs text-gray-500">insufficient task data</p>
        </div>
      </div>
    </div>
  );
}
