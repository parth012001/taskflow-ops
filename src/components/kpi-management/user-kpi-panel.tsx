"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, Settings2 } from "lucide-react";
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

export function UserKpiPanel() {
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
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
                {users.map((user) => (
                  <TableRow key={user.id}>
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
                      {user.assignedKpis.length === 0 ? (
                        <span className="text-gray-400 text-sm">None assigned</span>
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
                ))}
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
