"use client";

import { useState, useEffect } from "react";
import { UserPlus, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ReassignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  currentOwnerId: string;
  currentOwnerName: string;
  teamMembers: TeamMember[];
  onSuccess: () => void;
}

export function ReassignTaskModal({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  currentOwnerId,
  currentOwnerName,
  teamMembers,
  onSuccess,
}: ReassignTaskModalProps) {
  const [newOwnerId, setNewOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current owner from available members
  const availableMembers = teamMembers.filter((m) => m.id !== currentOwnerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOwnerId) {
      toast.error("Please select a new assignee");
      return;
    }

    if (reason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newOwnerId,
          reason,
          ...(newDeadline ? { newDeadline } : {}),
        }),
      });

      if (response.ok) {
        toast.success("Task reassigned successfully");
        onSuccess();
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reassign task");
      }
    } catch (error) {
      console.error("Error reassigning task:", error);
      toast.error("Failed to reassign task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewOwnerId("");
    setReason("");
    setNewDeadline("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Reassign Task
          </DialogTitle>
          <DialogDescription>
            Transfer this task to another team member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{taskTitle}</p>
            <p className="text-xs text-gray-500 mt-1">
              Currently assigned to: {currentOwnerName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newOwner">
              Assign To <span className="text-red-500">*</span>
            </Label>
            {availableMembers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No other team members available
              </p>
            ) : (
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Reassignment <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Why is this task being reassigned? (min 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={10}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/500 characters (min 10)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newDeadline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              New Deadline (Optional)
            </Label>
            <Input
              id="newDeadline"
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Leave empty to keep the current deadline
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !newOwnerId || reason.length < 10}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reassign Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
