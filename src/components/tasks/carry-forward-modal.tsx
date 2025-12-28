"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Calendar } from "lucide-react";
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

interface CarryForwardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  currentDeadline: string;
  onSuccess: () => void;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

export function CarryForwardModal({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  currentDeadline,
  onSuccess,
}: CarryForwardModalProps) {
  const [newDeadline, setNewDeadline] = useState(getTomorrow());
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/carry-forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newDeadline, reason }),
      });

      if (response.ok) {
        toast.success("Task carried forward successfully");
        onSuccess();
        onOpenChange(false);
        setReason("");
        setNewDeadline(getTomorrow());
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to carry forward task");
      }
    } catch (error) {
      console.error("Error carrying forward task:", error);
      toast.error("Failed to carry forward task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
      setNewDeadline(getTomorrow());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-indigo-600" />
            Carry Forward Task
          </DialogTitle>
          <DialogDescription>
            Move this task to a new deadline with a reason.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{taskTitle}</p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Current deadline: {new Date(currentDeadline).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newDeadline">New Deadline</Label>
            <Input
              id="newDeadline"
              type="date"
              value={newDeadline}
              min={formatDate(new Date())}
              onChange={(e) => setNewDeadline(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Carry Forward
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Why does this task need to be carried forward? (min 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {reason.length}/500 characters (min 10)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || reason.length < 10}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Carry Forward
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
