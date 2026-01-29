"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Power,
  Key,
  Loader2,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserFormModal } from "./user-form-modal";
import { ResetPasswordModal } from "./reset-password-modal";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  department: { id: string; name: string } | null;
  manager: { id: string; firstName: string; lastName: string } | null;
  managerName: string | null;
  subordinateCount: number;
}

interface Department {
  id: string;
  name: string;
  _count: { users: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Dept Head",
  ADMIN: "Admin",
};

const roleBadgeColors: Record<Role, string> = {
  EMPLOYEE: "bg-gray-100 text-gray-700 border-gray-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  DEPARTMENT_HEAD: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-red-100 text-red-700 border-red-200",
};

export function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const debouncedSearch = useDebounce(search, 300);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [toggleStatusUser, setToggleStatusUser] = useState<User | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (roleFilter) params.append("role", roleFilter);
      if (departmentFilter) params.append("departmentId", departmentFilter);
      if (statusFilter) params.append("isActive", statusFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, roleFilter, departmentFilter, statusFilter]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, roleFilter, departmentFilter, statusFilter]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!toggleStatusUser) return;

    setIsTogglingStatus(true);
    try {
      const response = await fetch(`/api/admin/users/${toggleStatusUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleStatusUser.isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user status");
      }

      toast.success(
        toggleStatusUser.isActive
          ? `${toggleStatusUser.firstName} ${toggleStatusUser.lastName} has been deactivated`
          : `${toggleStatusUser.firstName} ${toggleStatusUser.lastName} has been reactivated`
      );
      fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user status");
    } finally {
      setIsTogglingStatus(false);
      setToggleStatusUser(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    fetchUsers();
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Create and manage user accounts for your organization
            </CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="DEPARTMENT_HEAD">Dept Head</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Depts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border rounded-lg animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-48 flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {search || roleFilter || departmentFilter || statusFilter
                  ? "No users found"
                  : "No users yet"}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-4">
                {search || roleFilter || departmentFilter || statusFilter
                  ? "Try adjusting your filters to find what you're looking for."
                  : "Get started by creating your first user account."}
              </p>
              {!search && !roleFilter && !departmentFilter && !statusFilter && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First User
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">User</TableHead>
                      <TableHead className="w-[100px]">Role</TableHead>
                      <TableHead className="w-[140px]">Department</TableHead>
                      <TableHead className="w-[140px]">Reports To</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                        {/* User column */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                              {user.mustChangePassword && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200"
                                    >
                                      Pending
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Password change required on next login
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>

                        {/* Role column */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${roleBadgeColors[user.role]}`}
                          >
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>

                        {/* Department column */}
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {user.department?.name || "—"}
                          </span>
                        </TableCell>

                        {/* Reports To column */}
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {user.managerName || "—"}
                          </span>
                        </TableCell>

                        {/* Status column */}
                        <TableCell>
                          {user.isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions column */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(user)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit user</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResetPasswordUser(user)}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reset password</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setToggleStatusUser(user)}
                                  className={
                                    user.isActive
                                      ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      : "text-green-600 hover:text-green-700 hover:bg-green-50"
                                  }
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {user.isActive ? "Deactivate" : "Reactivate"}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UserFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />

      <ResetPasswordModal
        open={!!resetPasswordUser}
        onOpenChange={(open) => !open && setResetPasswordUser(null)}
        user={resetPasswordUser}
        onSuccess={fetchUsers}
      />

      <AlertDialog
        open={!!toggleStatusUser}
        onOpenChange={(open) => !open && setToggleStatusUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleStatusUser?.isActive ? "Deactivate User" : "Reactivate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleStatusUser?.isActive ? (
                <>
                  Are you sure you want to deactivate{" "}
                  <strong>
                    {toggleStatusUser?.firstName} {toggleStatusUser?.lastName}
                  </strong>
                  ? They will no longer be able to log in to the system.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate{" "}
                  <strong>
                    {toggleStatusUser?.firstName} {toggleStatusUser?.lastName}
                  </strong>
                  ? They will be able to log in to the system again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTogglingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className={
                toggleStatusUser?.isActive
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {isTogglingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {toggleStatusUser?.isActive ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
