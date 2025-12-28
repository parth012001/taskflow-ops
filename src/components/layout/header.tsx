"use client";

import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

interface HeaderProps {
  user: {
    firstName: string;
    lastName: string;
    role: Role;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden -m-2.5 p-2.5 text-gray-700"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Page title area - can be customized per page */}
        <div className="flex-1 lg:ml-0">
          <h1 className="text-lg font-semibold text-gray-900 lg:hidden">
            TaskFlow
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <NotificationDropdown />

          {/* User dropdown - simplified for now */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <span className="text-sm text-gray-700">
              {user.firstName} {user.lastName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
