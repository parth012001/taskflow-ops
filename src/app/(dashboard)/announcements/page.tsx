"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { AnnouncementsPanel } from "@/components/announcements/announcements-panel";

export default function AnnouncementsPage() {
  const { data: session, status } = useSession();

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect if not authorized
  if (!session?.user || !["ADMIN", "DEPARTMENT_HEAD"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Megaphone className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500">
            Create and manage company-wide announcements
          </p>
        </div>
      </div>

      <AnnouncementsPanel />
    </div>
  );
}
