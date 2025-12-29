"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  Target,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    role: Role;
  };
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "ADMIN"],
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    roles: ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "ADMIN"],
  },
  {
    name: "Daily Planning",
    href: "/daily-planning",
    icon: Target,
    roles: ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "ADMIN"],
  },
  {
    name: "Team",
    href: "/team",
    icon: Users,
    roles: ["MANAGER", "DEPARTMENT_HEAD", "ADMIN"],
  },
  {
    name: "Announcements",
    href: "/announcements",
    icon: Megaphone,
    roles: ["DEPARTMENT_HEAD", "ADMIN"],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "ADMIN"],
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-gray-900">TaskFlow</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                    isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500"
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user.role.toLowerCase().replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
