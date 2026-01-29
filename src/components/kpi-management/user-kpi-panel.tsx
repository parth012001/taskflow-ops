"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings2, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { UserKpiModal } from "./user-kpi-modal";

interface AssignedKpi {
  userKpiId: string;
  kpiBucketId: string;
  kpiBucketName: string;
  targetValue: number | null;
  currentValue: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department: { id: string; name: string } | null;
  assignedKpis: AssignedKpi[];
}

interface KpiBucket {
  id: string;
  name: string;
  description: string | null;
  applicableRoles: Role[];
  isActive: boolean;
}

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Dept Head",
  ADMIN: "Admin",
};

const roleBadgeColors: Record<Role, string> = {
  EMPLOYEE: "bg-gray-100 text-gray-700",
  MANAGER: "bg-blue-100 text-blue-700",
  DEPARTMENT_HEAD: "bg-purple-100 text-purple-700",
  ADMIN: "bg-red-100 text-red-700",
};

interface UserKpiPanelProps {
  onDataChange?: () => void;
}

export function UserKpiPanel({ onDataChange }: UserKpiPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [kpiBuckets, setKpiBuckets] = useState<KpiBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, bucketsRes] = await Promise.all([
        fetch("/api/kpi-management/users"),
        fetch("/api/kpi-management/buckets"),
      ]);

      if (!usersRes.ok) {
        const error = await usersRes.json();
        throw new Error(error.error || "Failed to load users");
      }

      if (!bucketsRes.ok) {
        const error = await bucketsRes.json();
        throw new Error(error.error || "Failed to load KPI buckets");
      }

      const usersData = await usersRes.json();
      const bucketsData = await bucketsRes.json();

      setUsers(usersData.users);
      setKpiBuckets(bucketsData.kpiBuckets.filter((b: KpiBucket) => b.isActive));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load data"
      );
      setUsers([]);
      setKpiBuckets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManageKpis = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    fetchData();
    onDataChange?.();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User KPI Assignments</CardTitle>
          <CardDescription>
            Assign KPI buckets to users based on their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            /* Loading Skeleton */
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-8 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            /* Enhanced Empty State */
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Users will appear here once they are added to the system. You can then assign KPI buckets to track their performance.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Assigned KPIs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isUnassigned = user.assignedKpis.length === 0;
                  return (
                    <TableRow
                      key={user.id}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        isUnassigned && "bg-amber-50/50"
                      )}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={roleBadgeColors[user.role]}
                        >
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {user.department?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {isUnassigned ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Unassigned
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedKpis.slice(0, 3).map((kpi) => (
                              <Badge
                                key={kpi.userKpiId}
                                variant="secondary"
                                className="text-xs"
                              >
                                {kpi.kpiBucketName}
                              </Badge>
                            ))}
                            {user.assignedKpis.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.assignedKpis.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageKpis(user)}
                        >
                          <Settings2 className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <UserKpiModal
          open={isModalOpen}
          onOpenChange={handleModalClose}
          user={selectedUser}
          kpiBuckets={kpiBuckets}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
