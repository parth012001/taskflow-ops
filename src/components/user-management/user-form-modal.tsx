"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  department: { id: string; name: string } | null;
  manager: { id: string; firstName: string; lastName: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface PotentialManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department: { id: string; name: string } | null;
}

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
}

const roleOptions: { value: Role; label: string }[] = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "DEPARTMENT_HEAD", label: "Department Head" },
];

export function UserFormModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormModalProps) {
  const isEditing = !!user;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<PotentialManager[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Success state for showing temporary password
  const [createdUser, setCreatedUser] = useState<{
    user: User;
    temporaryPassword?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch departments and managers
  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      Promise.all([
        fetch("/api/admin/departments").then((res) => res.json()),
        fetch("/api/admin/users/potential-managers").then((res) => res.json()),
      ])
        .then(([deptData, managerData]) => {
          setDepartments(deptData.departments || []);
          setManagers(managerData.managers || []);
        })
        .catch((error) => {
          console.error("Error fetching form data:", error);
          toast.error("Failed to load form data");
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [open]);

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (open) {
      setCreatedUser(null);
      setCopied(false);
      if (user) {
        setEmail(user.email);
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setRole(user.role);
        setDepartmentId(user.department?.id || "");
        setManagerId(user.manager?.id || "");
        setPassword("");
        setAutoGeneratePassword(true);
      } else {
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("EMPLOYEE");
        setDepartmentId("");
        setManagerId("");
        setPassword("");
        setAutoGeneratePassword(true);
      }
    }
  }, [open, user]);

  const handleCopyPassword = async () => {
    if (createdUser?.temporaryPassword) {
      await navigator.clipboard.writeText(createdUser.temporaryPassword);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (!isEditing && !email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!isEditing && !autoGeneratePassword && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/admin/users/${user.id}` : "/api/admin/users";
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        departmentId: departmentId || null,
        managerId: managerId || null,
      };

      if (!isEditing) {
        body.email = email.trim().toLowerCase();
        body.autoGeneratePassword = autoGeneratePassword;
        if (!autoGeneratePassword) {
          body.password = password;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save user");
      }

      const result = await response.json();

      if (!isEditing && result.temporaryPassword) {
        // Show the temporary password
        setCreatedUser({
          user: result.user,
          temporaryPassword: result.temporaryPassword,
        });
        toast.success("User created successfully");
      } else {
        toast.success(isEditing ? "User updated successfully" : "User created successfully");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (createdUser) {
      onSuccess();
    }
    onOpenChange(false);
  };

  // Filter managers - exclude the user being edited
  const filteredManagers = managers.filter((m) => !user || m.id !== user.id);

  if (createdUser) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              The user has been created with a temporary password. Share these credentials securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-500">Email</Label>
              <p className="font-medium">{createdUser.user.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-500">Name</Label>
              <p className="font-medium">
                {createdUser.user.firstName} {createdUser.user.lastName}
              </p>
            </div>

            {createdUser.temporaryPassword && (
              <div className="space-y-2">
                <Label className="text-gray-500">Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                    {createdUser.temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-amber-600">
                  The user will be required to change this password on first login.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle>
          {!isEditing && (
            <DialogDescription>
              Create a new user account. They will receive a temporary password.
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email - only for create */}
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  required
                />
              </div>
            )}

            {/* Email display for edit */}
            {isEditing && (
              <div className="space-y-2">
                <Label className="text-gray-500">Email</Label>
                <p className="text-sm py-2 px-3 bg-gray-50 rounded border">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
            )}

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  maxLength={50}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  maxLength={50}
                  required
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={departmentId || "none"}
                onValueChange={(v) => setDepartmentId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manager */}
            <div className="space-y-2">
              <Label htmlFor="manager">Reports To</Label>
              <Select
                value={managerId || "none"}
                onValueChange={(v) => setManagerId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {filteredManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} ({manager.role.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password section - only for create */}
            {!isEditing && (
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-generate Password</Label>
                    <p className="text-xs text-gray-500">
                      Generate a secure random password
                    </p>
                  </div>
                  <Switch
                    checked={autoGeneratePassword}
                    onCheckedChange={setAutoGeneratePassword}
                  />
                </div>

                {!autoGeneratePassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Min 8 characters, must include uppercase, lowercase, and number
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
