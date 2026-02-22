"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export function ScoreBadge({ score, size = "sm" }: ScoreBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        getScoreColor(score),
        size === "lg" && "text-sm px-3 py-1"
      )}
    >
      {Math.round(score)}
    </Badge>
  );
}
