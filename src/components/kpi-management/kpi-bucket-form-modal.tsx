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
} from "@/components/ui/dialog";

interface KpiBucket {
  id: string;
  name: string;
  description: string | null;
  applicableRoles: Role[];
  isActive: boolean;
}

interface KpiBucketFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket?: KpiBucket | null;
  onSuccess: () => void;
}

const roleOptions: { value: Role; label: string }[] = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "DEPARTMENT_HEAD", label: "Department Head" },
];

export function KpiBucketFormModal({
  open,
  onOpenChange,
  bucket,
  onSuccess,
}: KpiBucketFormModalProps) {
  const isEditing = !!bucket;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [applicableRoles, setApplicableRoles] = useState<Role[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Reset form when modal opens/closes or bucket changes
  useEffect(() => {
    if (open) {
      if (bucket) {
        setName(bucket.name);
        setDescription(bucket.description || "");
        setApplicableRoles(bucket.applicableRoles.filter(r => r !== "ADMIN"));
        setIsActive(bucket.isActive);
      } else {
        setName("");
        setDescription("");
        setApplicableRoles([]);
        setIsActive(true);
      }
    }
  }, [open, bucket]);

  const handleRoleToggle = (role: Role) => {
    setApplicableRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    if (applicableRoles.length === 0) {
      toast.error("At least one role must be selected");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/kpi-management/buckets/${bucket.id}`
        : "/api/kpi-management/buckets";
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: trimmedName,
        description: description.trim() || null,
        applicableRoles,
      };

      if (isEditing) {
        body.isActive = isActive;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save KPI bucket");
      }

      toast.success(
        isEditing ? "KPI bucket updated" : "KPI bucket created"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving KPI bucket:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save KPI bucket"
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
            {isEditing ? "Edit KPI Bucket" : "Create KPI Bucket"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Purchase Accuracy"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this KPI measures..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right">
              {description.length}/500
            </p>
          </div>

          <div className="space-y-2">
            <Label>Applicable Roles *</Label>
            <p className="text-xs text-gray-500 mb-2">
              Select which roles can have tasks assigned to this KPI
            </p>
            <div className="space-y-2">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={applicableRoles.includes(option.value)}
                    onChange={() => handleRoleToggle(option.value)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">Active</span>
              </label>
              <p className="text-xs text-gray-500">
                Inactive KPIs won&apos;t appear when creating new tasks
              </p>
            </div>
          )}

          <DialogFooter>
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
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
