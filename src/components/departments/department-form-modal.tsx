"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Department {
  id: string;
  name: string;
  description: string | null;
  head: { id: string; firstName: string; lastName: string } | null;
}

interface PotentialHead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

interface DepartmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  onSuccess: () => void;
}

export function DepartmentFormModal({
  open,
  onOpenChange,
  department,
  onSuccess,
}: DepartmentFormModalProps) {
  const isEditing = !!department;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [potentialHeads, setPotentialHeads] = useState<PotentialHead[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headId, setHeadId] = useState<string>("");

  // Fetch potential department heads
  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      fetch("/api/admin/users/potential-managers")
        .then((res) => res.json())
        .then((data) => {
          const heads = (data.managers || []).filter(
            (m: PotentialHead) => m.role === "DEPARTMENT_HEAD"
          );
          setPotentialHeads(heads);
        })
        .catch((error) => {
          console.error("Error fetching potential heads:", error);
          toast.error("Failed to load department heads");
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [open]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (department) {
        setName(department.name);
        setDescription(department.description || "");
        setHeadId(department.head?.id || "");
      } else {
        setName("");
        setDescription("");
        setHeadId("");
      }
    }
  }, [open, department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/admin/departments/${department.id}`
        : "/api/admin/departments";
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        headId: headId || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save department");
      }

      toast.success(
        isEditing
          ? "Department updated successfully"
          : "Department created successfully"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save department"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Department" : "Create Department"}
          </DialogTitle>
          {!isEditing && (
            <DialogDescription>
              Add a new department to your organization.
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering"
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the department"
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-head">Department Head</Label>
              <Select
                value={headId || "none"}
                onValueChange={(v) => setHeadId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department head</SelectItem>
                  {potentialHeads.map((head) => (
                    <SelectItem key={head.id} value={head.id}>
                      {head.firstName} {head.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
