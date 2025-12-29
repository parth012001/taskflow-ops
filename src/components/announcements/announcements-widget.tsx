"use client";

import { Megaphone, Calendar, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  author: string;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
}

interface AnnouncementsWidgetProps {
  announcements: Announcement[];
  maxItems?: number;
}

const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  GENERAL: { label: "General", variant: "secondary" },
  BIRTHDAY: { label: "Birthday", variant: "outline" },
  EVENT: { label: "Event", variant: "default" },
  POLICY: { label: "Policy", variant: "secondary" },
};

function formatTimeAgo(dateString: Date | string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AnnouncementsWidget({
  announcements,
  maxItems = 3,
}: AnnouncementsWidgetProps) {
  const displayedAnnouncements = announcements.slice(0, maxItems);

  if (announcements.length === 0) {
    return null; // Don't show widget if no announcements
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5 text-blue-600" />
          Announcements
        </CardTitle>
        <CardDescription>
          {announcements.length} active announcement{announcements.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={announcements.length > 2 ? "h-48" : ""}>
          <div className="space-y-3">
            {displayedAnnouncements.map((announcement) => {
              const isHighPriority = announcement.priority === "HIGH";
              const typeInfo = typeConfig[announcement.type] || typeConfig.GENERAL;

              return (
                <div
                  key={announcement.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    isHighPriority
                      ? "border-l-4 border-l-red-500 bg-red-50/50"
                      : "bg-gray-50/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isHighPriority && (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={typeInfo.variant} className="text-xs">
                          {typeInfo.label}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(announcement.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm mt-1 text-gray-900">
                        {announcement.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        — {announcement.author}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {announcements.length > maxItems && (
          <p className="text-xs text-center text-gray-400 mt-3">
            +{announcements.length - maxItems} more announcements
          </p>
        )}
      </CardContent>
    </Card>
  );
}
