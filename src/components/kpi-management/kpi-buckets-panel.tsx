"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
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

export function KpiBucketsPanel() {
  const [kpiBuckets, setKpiBuckets] = useState<KpiBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState<KpiBucket | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchKpiBuckets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/kpi-management/buckets");
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const text = await response.text();
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

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/kpi-management/buckets/${deleteConfirmId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to deactivate KPI bucket");
      }

      toast.success("KPI bucket deactivated");
      fetchKpiBuckets();
    } catch (error) {
      console.error("Error deactivating KPI bucket:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate KPI bucket"
      );
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBucket(null);
  };

  const handleFormSuccess = () => {
    fetchKpiBuckets();
  };

  return (
    <>
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : kpiBuckets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No KPI buckets yet</p>
              <p className="text-sm">Create your first KPI bucket above</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Applicable Roles</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Assigned Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiBuckets.map((bucket) => (
                  <TableRow key={bucket.id}>
                    <TableCell className="font-medium">
                      {bucket.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-gray-500">
                      {bucket.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {bucket.applicableRoles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {roleLabels[role]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{bucket._count.tasks}</TableCell>
                    <TableCell>{bucket._count.userKpis}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bucket)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {bucket.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(bucket.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
