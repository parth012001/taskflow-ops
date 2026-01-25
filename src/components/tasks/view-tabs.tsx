"use client";

import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { User, Users, Globe } from "lucide-react";

export type ViewMode = "my" | "team" | "all";

interface ViewTabsProps {
  role: Role;
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

interface TabConfig {
  id: ViewMode;
  label: string;
  icon: typeof User;
}

const TABS: TabConfig[] = [
  { id: "my", label: "My Tasks", icon: User },
  { id: "team", label: "Team Tasks", icon: Users },
  { id: "all", label: "All Tasks", icon: Globe },
];

function getVisibleTabs(role: Role): TabConfig[] {
  switch (role) {
    case Role.EMPLOYEE:
      // Employees only see their own tasks - no tabs needed
      return [];
    case Role.MANAGER:
      // Managers can see their tasks and team tasks
      return TABS.filter((tab) => tab.id === "my" || tab.id === "team");
    case Role.DEPARTMENT_HEAD:
    case Role.ADMIN:
      // Department heads and admins see all tabs
      return TABS;
    default:
      return [];
  }
}

export function ViewTabs({ role, activeView, onViewChange }: ViewTabsProps) {
  const visibleTabs = getVisibleTabs(role);

  // Don't render anything for employees or if no tabs
  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
