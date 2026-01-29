"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Target, ChevronDown, ChevronRight, Check, X } from "lucide-react";
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
  const [showNonApplicable, setShowNonApplicable] = useState(false);

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
      setShowNonApplicable(false);
    }
  }, [open, user, kpiBuckets]);

  // Separate applicable and non-applicable KPIs
  const applicableKpis = useMemo(() =>
    kpiBuckets.filter((bucket) => bucket.applicableRoles.includes(user.role)),
    [kpiBuckets, user.role]
  );

  const nonApplicableKpis = useMemo(() =>
    kpiBuckets.filter((bucket) => !bucket.applicableRoles.includes(user.role)),
    [kpiBuckets, user.role]
  );

  // Calculate pending changes
  const pendingChanges = useMemo(() => {
    let added = 0;
    let removed = 0;
    let updated = 0;

    assignments.forEach((assignment) => {
      const wasAssigned = user.assignedKpis.some(
        (a) => a.kpiBucketId === assignment.kpiBucketId
      );

      if (assignment.isAssigned && !wasAssigned) {
        added++;
      } else if (!assignment.isAssigned && wasAssigned) {
        removed++;
      } else if (assignment.isAssigned && wasAssigned) {
        const original = user.assignedKpis.find(
          (a) => a.kpiBucketId === assignment.kpiBucketId
        );
        const newTarget = assignment.targetValue
          ? parseFloat(assignment.targetValue)
          : null;
        if (original && original.targetValue !== newTarget) {
          updated++;
        }
      }
    });

    return { added, removed, updated, total: added + removed + updated };
  }, [assignments, user.assignedKpis]);

  // Quick actions
  const handleSelectAll = () => {
    setAssignments((prev) => {
      const updated = new Map(prev);
      applicableKpis.forEach((bucket) => {
        const current = updated.get(bucket.id);
        if (current) {
          updated.set(bucket.id, { ...current, isAssigned: true });
        }
      });
      return updated;
    });
  };

  const handleClearAll = () => {
    setAssignments((prev) => {
      const updated = new Map(prev);
      applicableKpis.forEach((bucket) => {
        const current = updated.get(bucket.id);
        if (current) {
          updated.set(bucket.id, { ...current, isAssigned: false, targetValue: "" });
        }
      });
      return updated;
    });
  };

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
      // Build operation descriptors with metadata for tracking
      interface Operation {
        type: "add" | "remove" | "update";
        label: string;
        execute: () => Promise<Response>;
      }

      const operations: Operation[] = [];

      assignments.forEach((assignment) => {
        const wasAssigned = user.assignedKpis.some(
          (a) => a.kpiBucketId === assignment.kpiBucketId
        );
        const bucket = kpiBuckets.find((b) => b.id === assignment.kpiBucketId);
        const bucketName = bucket?.name || assignment.kpiBucketId;

        if (assignment.isAssigned && !wasAssigned) {
          // New assignment
          const targetValue = assignment.targetValue
            ? parseFloat(assignment.targetValue)
            : undefined;
          operations.push({
            type: "add",
            label: `Assign "${bucketName}"`,
            execute: () =>
              fetch("/api/kpi-management/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: user.id,
                  kpiBucketId: assignment.kpiBucketId,
                  targetValue,
                }),
              }),
          });
        } else if (!assignment.isAssigned && wasAssigned && assignment.userKpiId) {
          // Remove assignment
          operations.push({
            type: "remove",
            label: `Remove "${bucketName}"`,
            execute: () =>
              fetch(`/api/kpi-management/assign/${assignment.userKpiId}`, {
                method: "DELETE",
              }),
          });
        } else if (assignment.isAssigned && wasAssigned && assignment.userKpiId) {
          // Check if target changed
          const original = user.assignedKpis.find(
            (a) => a.kpiBucketId === assignment.kpiBucketId
          );
          const newTarget = assignment.targetValue
            ? parseFloat(assignment.targetValue)
            : null;
          if (original && original.targetValue !== newTarget) {
            operations.push({
              type: "update",
              label: `Update "${bucketName}" target`,
              execute: () =>
                fetch(`/api/kpi-management/assign/${assignment.userKpiId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ targetValue: newTarget }),
                }),
            });
          }
        }
      });

      if (operations.length === 0) {
        toast.info("No changes made");
        onOpenChange(false);
        return;
      }

      // Execute all operations and track individual results
      const results = await Promise.allSettled(
        operations.map(async (op) => {
          const response = await op.execute();
          if (!response.ok) {
            const text = await response.text();
            let errorMessage = `HTTP ${response.status}`;
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorMessage;
            } catch {
              if (text) errorMessage = text;
            }
            throw new Error(`${op.label}: ${errorMessage}`);
          }
          return { operation: op, response };
        })
      );

      // Analyze results
      const succeeded = results.filter(
        (r): r is PromiseFulfilledResult<{ operation: Operation; response: Response }> =>
          r.status === "fulfilled"
      );
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );

      // Report results to user
      if (failed.length === 0) {
        // All succeeded
        toast.success(`Updated ${succeeded.length} KPI assignment(s)`);
        onSuccess();
        onOpenChange(false);
      } else if (succeeded.length === 0) {
        // All failed
        const firstError = failed[0].reason;
        toast.error(
          firstError instanceof Error ? firstError.message : "All operations failed"
        );
        // Still refresh to show current state
        onSuccess();
      } else {
        // Partial success - this is the critical case
        const failedMessages = failed
          .map((f) => (f.reason instanceof Error ? f.reason.message : "Unknown error"))
          .slice(0, 3); // Limit to first 3 errors

        toast.warning(
          `Partial update: ${succeeded.length} succeeded, ${failed.length} failed`,
          {
            description: failedMessages.join("; ") + (failed.length > 3 ? "..." : ""),
            duration: 6000,
          }
        );
        // Refresh to show actual state - crucial for partial success
        onSuccess();
        // Keep modal open so user can retry failed operations
      }
    } catch (error) {
      // Unexpected error (network failure, etc.)
      console.error("Error saving KPI assignments:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes"
      );
      // Refresh in case any operations succeeded before the error
      onSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="text-lg">
            Manage KPIs for {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {roleLabels[user.role]}
              </Badge>
              {user.department && (
                <span className="text-sm text-muted-foreground">
                  {user.department.name}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Applicable KPIs Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">
                  Available KPIs ({applicableKpis.length})
                </span>
              </div>
              {applicableKpis.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-7 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {applicableKpis.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No KPIs available for {roleLabels[user.role]} role
                  </p>
                </div>
              ) : (
                applicableKpis.map((bucket) => {
                  const assignment = assignments.get(bucket.id);
                  const isAssigned = assignment?.isAssigned || false;
                  return (
                    <div
                      key={bucket.id}
                      className={`flex items-center gap-4 p-3 border rounded-lg transition-all ${
                        isAssigned
                          ? "border-purple-300 bg-purple-50/50 shadow-sm"
                          : "hover:bg-muted/50 hover:border-muted-foreground/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`kpi-${bucket.id}`}
                        checked={isAssigned}
                        onChange={() => handleToggle(bucket.id)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`kpi-${bucket.id}`}
                          className="font-medium text-sm cursor-pointer block text-foreground"
                        >
                          {bucket.name}
                        </label>
                        {bucket.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {bucket.description}
                          </p>
                        )}
                      </div>
                      {/* Target Value Field */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isAssigned ? (
                          <>
                            <Label
                              htmlFor={`target-${bucket.id}`}
                              className="text-xs text-muted-foreground whitespace-nowrap"
                            >
                              Target:
                            </Label>
                            <Input
                              id={`target-${bucket.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="--"
                              value={assignment?.targetValue || ""}
                              onChange={(e) =>
                                handleTargetChange(bucket.id, e.target.value)
                              }
                              className="h-8 w-20 text-sm"
                            />
                          </>
                        ) : (
                          <div className="w-[104px]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Non-applicable KPIs - Collapsible */}
          {nonApplicableKpis.length > 0 && (
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowNonApplicable(!showNonApplicable)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
              >
                {showNonApplicable ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">
                  Not Applicable ({nonApplicableKpis.length})
                </span>
              </button>
              {showNonApplicable && (
                <div className="space-y-2 mt-3">
                  {nonApplicableKpis.map((bucket) => (
                    <div
                      key={bucket.id}
                      className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30 opacity-60"
                    >
                      <input
                        type="checkbox"
                        disabled
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-muted-foreground">{bucket.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 pt-4 border-t space-y-3">
          {/* Pending Changes Indicator */}
          {pendingChanges.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-blue-700">Pending: </span>
              <span className="text-blue-600">
                {[
                  pendingChanges.added > 0 && `+${pendingChanges.added} new`,
                  pendingChanges.removed > 0 && `-${pendingChanges.removed} removed`,
                  pendingChanges.updated > 0 && `${pendingChanges.updated} updated`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
