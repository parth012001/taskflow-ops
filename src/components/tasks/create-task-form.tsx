"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskPriority, TaskSize } from "@prisma/client";
import { createTaskSchema, CreateTaskInput } from "@/lib/validations/task";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface KpiBucket {
  id: string;
  name: string;
  description?: string | null;
}

interface CreateTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  kpiBuckets: KpiBucket[];
}

const priorityOptions = [
  { value: TaskPriority.URGENT_IMPORTANT, label: "P1 - Urgent & Important" },
  { value: TaskPriority.URGENT_NOT_IMPORTANT, label: "P2 - Urgent" },
  { value: TaskPriority.NOT_URGENT_IMPORTANT, label: "P3 - Important" },
  { value: TaskPriority.NOT_URGENT_NOT_IMPORTANT, label: "P4 - Low Priority" },
];

const sizeOptions = [
  { value: TaskSize.EASY, label: "Easy (~30 min)" },
  { value: TaskSize.MEDIUM, label: "Medium (~1-2 hrs)" },
  { value: TaskSize.DIFFICULT, label: "Difficult (~4+ hrs)" },
];

const estimateOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
];

export function CreateTaskForm({
  open,
  onOpenChange,
  onSubmit,
  kpiBuckets,
}: CreateTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: TaskPriority.NOT_URGENT_IMPORTANT,
      size: TaskSize.MEDIUM,
      estimatedMinutes: 60,
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: CreateTaskInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe the task (optional)"
              rows={3}
            />
          </div>

          {/* KPI Bucket */}
          <div className="space-y-2">
            <Label>KPI Bucket *</Label>
            <Select onValueChange={(value) => setValue("kpiBucketId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select KPI bucket" />
              </SelectTrigger>
              <SelectContent>
                {kpiBuckets.map((bucket) => (
                  <SelectItem key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.kpiBucketId && (
              <p className="text-sm text-red-500">{errors.kpiBucketId.message}</p>
            )}
          </div>

          {/* Priority & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select
                defaultValue={TaskPriority.NOT_URGENT_IMPORTANT}
                onValueChange={(value) => setValue("priority", value as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Size *</Label>
              <Select
                defaultValue={TaskSize.MEDIUM}
                onValueChange={(value) => setValue("size", value as TaskSize)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimate & Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time Estimate *</Label>
              <Select
                defaultValue="60"
                onValueChange={(value) => setValue("estimatedMinutes", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estimateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="datetime-local"
                {...register("deadline")}
              />
              {errors.deadline && (
                <p className="text-sm text-red-500">{errors.deadline.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
