import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckSquare, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  // Placeholder stats - will be replaced with real data
  const stats = [
    {
      name: "Tasks In Progress",
      value: "3",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      name: "Pending Review",
      value: "2",
      icon: CheckSquare,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      name: "Overdue",
      value: "1",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      name: "Completed Today",
      value: "4",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user.firstName}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what&apos;s happening with your tasks today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions and recent tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily ritual reminder */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Planning</CardTitle>
            <CardDescription>
              Complete your morning ritual to start the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                  <span className="text-sm font-medium text-yellow-800">
                    Morning ritual not completed
                  </span>
                </div>
                <button className="text-sm font-medium text-yellow-600 hover:text-yellow-700">
                  Start now
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Plan your tasks, set priorities, and estimate time for today.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Today's priorities */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Priorities</CardTitle>
            <CardDescription>
              Your most urgent tasks for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="h-2 w-2 rounded-full bg-red-500 mr-3" />
                <span className="text-sm text-gray-700 flex-1">
                  Create PO for Office Supplies
                </span>
                <span className="text-xs text-gray-500">Due today</span>
              </div>
              <div className="flex items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="h-2 w-2 rounded-full bg-orange-500 mr-3" />
                <span className="text-sm text-gray-700 flex-1">
                  Process Vendor Bill - XYZ Ltd
                </span>
                <span className="text-xs text-gray-500">On hold</span>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="h-2 w-2 rounded-full bg-blue-500 mr-3" />
                <span className="text-sm text-gray-700 flex-1">
                  Vendor Registration - ABC Corp
                </span>
                <span className="text-xs text-gray-500">Due in 7 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Overview placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Overview</CardTitle>
          <CardDescription>
            Your performance across key areas this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: "PO Accuracy", value: 85, color: "bg-green-500" },
              { name: "Vendor Onboarding", value: 60, color: "bg-yellow-500" },
              { name: "Bill Handling", value: 92, color: "bg-green-500" },
              { name: "Delivery", value: 78, color: "bg-yellow-500" },
              { name: "Reports", value: 100, color: "bg-green-500" },
            ].map((kpi) => (
              <div key={kpi.name} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${kpi.value * 1.76} 176`}
                      className={kpi.color.replace("bg-", "text-")}
                    />
                  </svg>
                  <span className="absolute text-sm font-semibold">
                    {kpi.value}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{kpi.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
