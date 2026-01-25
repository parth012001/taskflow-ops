"use client";

import { ClipboardCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewQueueBannerProps {
  pendingCount: number;
  onViewClick: () => void;
  className?: string;
}

export function ReviewQueueBanner({
  pendingCount,
  onViewClick,
  className,
}: ReviewQueueBannerProps) {
  // Don't render if no pending reviews
  if (pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg",
        "bg-purple-50 border border-purple-200",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
          <ClipboardCheck className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-purple-900">
            {pendingCount} {pendingCount === 1 ? "task needs" : "tasks need"} your review
          </p>
          <p className="text-xs text-purple-700">
            Team members are waiting for your approval
          </p>
        </div>
      </div>
      <button
        onClick={onViewClick}
        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
      >
        View
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
