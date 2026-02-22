"use client";

import { cn } from "@/lib/utils";

const colorMap: Record<string, { bg: string; border: string; text: string; value: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", value: "text-blue-700" },
  green: { bg: "bg-green-50", border: "border-green-100", text: "text-green-600", value: "text-green-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-600", value: "text-purple-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", value: "text-amber-700" },
};

interface PillarCardProps {
  title: string;
  score: number;
  color: "blue" | "green" | "purple" | "amber";
  stats: { label: string; value: string }[];
}

export function PillarCard({ title, score, color, stats }: PillarCardProps) {
  const colors = colorMap[color];

  return (
    <div className={cn("rounded-lg p-4 border", colors.bg, colors.border)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={cn("text-sm font-medium", colors.text)}>{title}</h4>
        <span className={cn("text-lg font-bold", colors.value)}>
          {Math.round(score)}
        </span>
      </div>
      <div className="space-y-1">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{stat.label}</span>
            <span className={cn("font-medium", colors.value)}>{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
