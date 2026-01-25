"use client";

import { useState, useEffect } from "react";
import { Loader2, Pause, RotateCcw } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TransitionReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  toStatus: TaskStatus;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

function getTransitionConfig(toStatus: TaskStatus) {
  switch (toStatus) {
    case TaskStatus.ON_HOLD:
      return {
        title: "Put Task On Hold",
        description: "Provide a reason for putting this task on hold.",
        icon: Pause,
        iconColor: "text-yellow-600",
        placeholder: "Why is this task being put on hold? (min 10 characters)",
        buttonText: "Put On Hold",
        buttonVariant: "default" as const,
      };
    case TaskStatus.REOPENED:
      return {
        title: "Reopen Task",
        description: "Provide feedback on why this task needs more work.",
        icon: RotateCcw,
        iconColor: "text-red-600",
        placeholder: "What needs to be fixed or improved? (min 10 characters)",
        buttonText: "Reopen Task",
        buttonVariant: "destructive" as const,
      };
    default:
      return {
        title: "Transition Task",
        description: "Provide a reason for this transition.",
        icon: Pause,
        iconColor: "text-gray-600",
        placeholder: "Reason for transition (min 10 characters)",
        buttonText: "Confirm",
        buttonVariant: "default" as const,
      };
  }
}

export function TransitionReasonModal({
  open,
  onOpenChange,
  taskTitle,
  toStatus,
  onConfirm,
  onCancel,
}: TransitionReasonModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = getTransitionConfig(toStatus);
  const Icon = config.icon;
  const isValid = reason.trim().length >= MIN_REASON_LENGTH;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setReason("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    setIsSubmitting(true);

    try {
      await onConfirm(reason.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{taskTitle}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={config.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={MIN_REASON_LENGTH}
              maxLength={MAX_REASON_LENGTH}
              autoFocus
            />
            <p className="text-xs text-gray-500">
              {reason.length}/{MAX_REASON_LENGTH} characters (min {MIN_REASON_LENGTH})
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={config.buttonVariant}
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {config.buttonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
