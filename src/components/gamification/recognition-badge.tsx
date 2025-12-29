"use client";

import { RecognitionType } from "@prisma/client";
import {
  Star,
  Crown,
  Trophy,
  Award,
  Users,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

const badgeConfig: Record<RecognitionType, BadgeConfig> = {
  EFFICIENT_STAR: {
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    label: "Efficient Star",
    description: "Achieved a 5-day morning ritual streak",
  },
  CONSISTENCY_KING: {
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Consistency King",
    description: "Achieved a 20-day morning ritual streak",
  },
  STAR_OF_DAY: {
    icon: Trophy,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Star of the Day",
    description: "Outstanding performance recognized",
  },
  HIGH_PERFORMER_WEEK: {
    icon: Award,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "High Performer",
    description: "Top performer of the week",
  },
  BEST_TEAM_PLAYER: {
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Team Player",
    description: "Recognized for excellent teamwork",
  },
  MOST_IMPROVED: {
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    label: "Most Improved",
    description: "Significant improvement recognized",
  },
};

interface RecognitionBadgeProps {
  type: RecognitionType;
  awardedDate?: Date | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showTooltip?: boolean;
}

export function RecognitionBadge({
  type,
  awardedDate,
  size = "md",
  showLabel = true,
  showTooltip = true,
}: RecognitionBadgeProps) {
  const config = badgeConfig[type];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const formattedDate = awardedDate
    ? new Date(awardedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const badge = (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          config.bgColor,
          sizeClasses[size]
        )}
      >
        <Icon className={cn(config.color, iconSizes[size])} />
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-xs font-medium text-gray-700">{config.label}</p>
          {formattedDate && (
            <p className="text-[10px] text-gray-400">{formattedDate}</p>
          )}
        </div>
      )}
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{config.label}</p>
        <p className="text-xs opacity-80">{config.description}</p>
        {formattedDate && (
          <p className="text-xs opacity-60 mt-1">Earned on {formattedDate}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export { badgeConfig };
