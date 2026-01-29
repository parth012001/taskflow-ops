"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Power, Loader2, Boxes } from "lucide-react";
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
import { KpiBucketFormModal } from "./kpi-bucket-form-modal";

interface KpiBucket {
  id: string;
  name: string;
  description: string | null;
  applicableRoles: Role[];
  isActive: boolean;
  _count: {
    tasks: number;
    userKpis: number;
  };
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

interface KpiBucketsPanelProps {
  onDataChange?: () => void;
}

export function KpiBucketsPanel({ onDataChange }: KpiBucketsPanelProps) {
  const [kpiBuckets, setKpiBuckets] = useState<KpiBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState<KpiBucket | null>(null);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [reactivateConfirmId, setReactivateConfirmId] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  const fetchKpiBuckets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/kpi-management/buckets");
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (text) {
            errorMessage = text;
          }
          console.error("Error fetching KPI buckets:", response.status, text);
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setKpiBuckets(data.kpiBuckets);
    } catch (error) {
      console.error("Error fetching KPI buckets:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load KPI buckets"
      );
      setKpiBuckets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpiBuckets();
  }, [fetchKpiBuckets]);

  const handleEdit = (bucket: KpiBucket) => {
    setEditingBucket(bucket);
    setIsFormOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirmId) return;

    setIsDeactivating(true);
    try {
      const response = await fetch(`/api/kpi-management/buckets/${deactivateConfirmId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Failed to deactivate KPI bucket";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (text) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

      toast.success("KPI bucket deactivated");
      fetchKpiBuckets();
      onDataChange?.();
    } catch (error) {
      console.error("Error deactivating KPI bucket:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate KPI bucket"
      );
    } finally {
      setIsDeactivating(false);
      setDeactivateConfirmId(null);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateConfirmId) return;

    setIsReactivating(true);
    try {
      const response = await fetch(`/api/kpi-management/buckets/${reactivateConfirmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Failed to reactivate KPI bucket";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (text) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

      toast.success("KPI bucket reactivated");
      fetchKpiBuckets();
      onDataChange?.();
    } catch (error) {
      console.error("Error reactivating KPI bucket:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reactivate KPI bucket"
      );
    } finally {
      setIsReactivating(false);
      setReactivateConfirmId(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBucket(null);
  };

  const handleFormSuccess = () => {
    fetchKpiBuckets();
    onDataChange?.();
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>KPI Buckets</CardTitle>
            <CardDescription>
              Create and manage KPI categories for task tracking
            </CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create KPI Bucket
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            /* Loading Skeleton */
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-48 flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : kpiBuckets.length === 0 ? (
            /* Enhanced Empty State */
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mb-4">
                <Boxes className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No KPI Buckets Yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-4">
                KPI buckets help you categorize and track performance metrics for tasks. Create your first bucket to get started.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First KPI Bucket
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">KPI Bucket</TableHead>
                    <TableHead className="w-[180px]">Roles</TableHead>
                    <TableHead className="w-[100px]">Stats</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiBuckets.map((bucket) => (
                    <TableRow key={bucket.id} className="hover:bg-muted/50 transition-colors">
                      {/* KPI Bucket column - Name + Description */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{bucket.name}</p>
                          {bucket.description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm text-gray-500 truncate max-w-[300px] cursor-default">
                                  {bucket.description}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>{bucket.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>

                      {/* Roles column - compact color-coded badges */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {bucket.applicableRoles.slice(0, 2).map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className={`text-xs py-0.5 px-1.5 ${roleBadgeColors[role]}`}
                            >
                              {roleLabels[role]}
                            </Badge>
                          ))}
                          {bucket.applicableRoles.length > 2 && (
                            <Badge variant="outline" className="text-xs py-0.5 px-1.5 bg-gray-100">
                              +{bucket.applicableRoles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Stats column - Tasks + Assignments */}
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          <p>{bucket._count.tasks} tasks</p>
                          <p>{bucket._count.userKpis} assigned</p>
                        </div>
                      </TableCell>

                      {/* Status column */}
                      <TableCell>
                        {bucket.isActive ? (
                          <Badge variant="outline" className="text-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions column */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(bucket)}
                                aria-label={`Edit bucket ${bucket.name || bucket.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit bucket</TooltipContent>
                          </Tooltip>
                          {bucket.isActive ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeactivateConfirmId(bucket.id)}
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  aria-label={`Deactivate bucket ${bucket.name || bucket.id}`}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Deactivate this bucket</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReactivateConfirmId(bucket.id)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  aria-label={`Reactivate bucket ${bucket.name || bucket.id}`}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reactivate this bucket</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <KpiBucketFormModal
        open={isFormOpen}
        onOpenChange={handleFormClose}
        bucket={editingBucket}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog
        open={!!deactivateConfirmId}
        onOpenChange={(open) => !open && setDeactivateConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate KPI Bucket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this KPI bucket? It will no
              longer be available for new tasks, but existing tasks will retain
              their KPI assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!reactivateConfirmId}
        onOpenChange={(open) => !open && setReactivateConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate KPI Bucket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate this KPI bucket? It will
              become available for new tasks again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={isReactivating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isReactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
