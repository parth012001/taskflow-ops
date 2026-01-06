"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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

interface KpiAssignment {
  kpiBucketId: string;
  isAssigned: boolean;
  targetValue: string;
  userKpiId?: string;
}

interface UserKpiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  kpiBuckets: KpiBucket[];
  onSuccess: () => void;
}

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Dept Head",
  ADMIN: "Admin",
};

export function UserKpiModal({
  open,
  onOpenChange,
  user,
  kpiBuckets,
  onSuccess,
}: UserKpiModalProps) {
  const [assignments, setAssignments] = useState<Map<string, KpiAssignment>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Initialize assignments when modal opens
  useEffect(() => {
    if (open) {
      const initialAssignments = new Map<string, KpiAssignment>();

      // Set all applicable KPIs
      kpiBuckets.forEach((bucket) => {
        const existing = user.assignedKpis.find(
          (a) => a.kpiBucketId === bucket.id
        );

        initialAssignments.set(bucket.id, {
          kpiBucketId: bucket.id,
          isAssigned: !!existing,
          targetValue: existing?.targetValue?.toString() || "",
          userKpiId: existing?.userKpiId,
        });
      });

      setAssignments(initialAssignments);
    }
  }, [open, user, kpiBuckets]);

  const handleToggle = (kpiBucketId: string) => {
    setAssignments((prev) => {
      const updated = new Map(prev);
      const current = updated.get(kpiBucketId);
      if (current) {
        updated.set(kpiBucketId, {
          ...current,
          isAssigned: !current.isAssigned,
        });
      }
      return updated;
    });
  };

  const handleTargetChange = (kpiBucketId: string, value: string) => {
    setAssignments((prev) => {
      const updated = new Map(prev);
      const current = updated.get(kpiBucketId);
      if (current) {
        updated.set(kpiBucketId, {
          ...current,
          targetValue: value,
        });
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const toAdd: { kpiBucketId: string; targetValue?: number }[] = [];
      const toRemove: string[] = [];
      const toUpdate: { userKpiId: string; targetValue: number | null }[] = [];

      assignments.forEach((assignment) => {
        const wasAssigned = user.assignedKpis.some(
          (a) => a.kpiBucketId === assignment.kpiBucketId
        );

        if (assignment.isAssigned && !wasAssigned) {
          // New assignment
          toAdd.push({
            kpiBucketId: assignment.kpiBucketId,
            targetValue: assignment.targetValue
              ? parseFloat(assignment.targetValue)
              : undefined,
          });
        } else if (!assignment.isAssigned && wasAssigned && assignment.userKpiId) {
          // Remove assignment
          toRemove.push(assignment.userKpiId);
        } else if (assignment.isAssigned && wasAssigned && assignment.userKpiId) {
          // Check if target changed
          const original = user.assignedKpis.find(
            (a) => a.kpiBucketId === assignment.kpiBucketId
          );
          const newTarget = assignment.targetValue
            ? parseFloat(assignment.targetValue)
            : null;
          if (original && original.targetValue !== newTarget) {
            toUpdate.push({
              userKpiId: assignment.userKpiId,
              targetValue: newTarget,
            });
          }
        }
      });

      // Execute all operations
      const operations: Promise<Response>[] = [];

      // Add new assignments
      for (const add of toAdd) {
        operations.push(
          fetch("/api/kpi-management/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              kpiBucketId: add.kpiBucketId,
              targetValue: add.targetValue,
            }),
          })
        );
      }

      // Remove assignments
      for (const userKpiId of toRemove) {
        operations.push(
          fetch(`/api/kpi-management/assign/${userKpiId}`, {
            method: "DELETE",
          })
        );
      }

      // Update target values
      for (const update of toUpdate) {
        operations.push(
          fetch(`/api/kpi-management/assign/${update.userKpiId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetValue: update.targetValue }),
          })
        );
      }

      const results = await Promise.all(operations);

      // Check for errors
      for (const result of results) {
        if (!result.ok) {
          const error = await result.json();
          throw new Error(error.error || "Failed to save changes");
        }
      }

      const changeCount = toAdd.length + toRemove.length + toUpdate.length;
      if (changeCount > 0) {
        toast.success(`Updated ${changeCount} KPI assignment(s)`);
      } else {
        toast.info("No changes made");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving KPI assignments:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Separate applicable and non-applicable KPIs
  const applicableKpis = kpiBuckets.filter((bucket) =>
    bucket.applicableRoles.includes(user.role)
  );
  const nonApplicableKpis = kpiBuckets.filter(
    (bucket) => !bucket.applicableRoles.includes(user.role)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Manage KPIs for {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mt-1">
              {roleLabels[user.role]}
            </Badge>
            {user.department && (
              <span className="ml-2 text-gray-500">
                {user.department.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Applicable KPIs */}
          <div>
            <Label className="text-sm font-medium">
              Available KPIs ({applicableKpis.length})
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              KPIs applicable to {roleLabels[user.role]} role
            </p>
            <div className="space-y-3 mt-2">
              {applicableKpis.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No KPIs available for this role
                </p>
              ) : (
                applicableKpis.map((bucket) => {
                  const assignment = assignments.get(bucket.id);
                  return (
                    <div
                      key={bucket.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <input
                        type="checkbox"
                        id={`kpi-${bucket.id}`}
                        checked={assignment?.isAssigned || false}
                        onChange={() => handleToggle(bucket.id)}
                        className="h-4 w-4 mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`kpi-${bucket.id}`}
                          className="font-medium text-sm cursor-pointer"
                        >
                          {bucket.name}
                        </label>
                        {bucket.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {bucket.description}
                          </p>
                        )}
                        {assignment?.isAssigned && (
                          <div className="mt-2">
                            <Label
                              htmlFor={`target-${bucket.id}`}
                              className="text-xs text-gray-500"
                            >
                              Target Value (optional)
                            </Label>
                            <Input
                              id={`target-${bucket.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g., 100"
                              value={assignment?.targetValue || ""}
                              onChange={(e) =>
                                handleTargetChange(bucket.id, e.target.value)
                              }
                              className="h-8 mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Non-applicable KPIs */}
          {nonApplicableKpis.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-400">
                Not Applicable ({nonApplicableKpis.length})
              </Label>
              <p className="text-xs text-gray-400 mb-2">
                These KPIs are not available for {roleLabels[user.role]} role
              </p>
              <div className="space-y-2 opacity-50">
                {nonApplicableKpis.map((bucket) => (
                  <div
                    key={bucket.id}
                    className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      disabled
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-500">{bucket.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
