"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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

// Helper to get local date string (YYYY-MM-DD) from a Date
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to convert a local date string to end of day in user's timezone as ISO string
function toEndOfDayISO(dateString: string): string {
  // Parse as local date, set to end of day (23:59:59.999)
  const [year, month, day] = dateString.split("-").map(Number);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  return endOfDay.toISOString();
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  expiresAt?: string | null;
}

interface AnnouncementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  onSuccess: () => void;
}

const typeOptions = [
  { value: "GENERAL", label: "General" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "EVENT", label: "Event" },
  { value: "POLICY", label: "Policy" },
];

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High (Urgent)" },
];

export function AnnouncementFormModal({
  open,
  onOpenChange,
  announcement,
  onSuccess,
}: AnnouncementFormModalProps) {
  const isEditing = !!announcement;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [priority, setPriority] = useState("NORMAL");
  const [expiresAt, setExpiresAt] = useState("");

  // Reset form when modal opens/closes or announcement changes
  useEffect(() => {
    if (open) {
      if (announcement) {
        setTitle(announcement.title);
        setContent(announcement.content);
        setType(announcement.type);
        setPriority(announcement.priority);
        setExpiresAt(
          announcement.expiresAt
            ? toLocalDateString(new Date(announcement.expiresAt))
            : ""
        );
      } else {
        setTitle("");
        setContent("");
        setType("GENERAL");
        setPriority("NORMAL");
        setExpiresAt("");
      }
    }
  }, [open, announcement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }

    if (trimmedContent.length < 10) {
      toast.error("Content must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/announcements/${announcement.id}`
        : "/api/announcements";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          type,
          priority,
          expiresAt: expiresAt ? toEndOfDayISO(expiresAt) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save announcement");
      }

      toast.success(
        isEditing ? "Announcement updated" : "Announcement created"
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save announcement"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Announcement" : "Create Announcement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter announcement content"
              rows={4}
              maxLength={5000}
            />
            <p className="text-xs text-gray-400 text-right">
              {content.length}/5000
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expires On (Optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={toLocalDateString(new Date())}
            />
            <p className="text-xs text-gray-400">
              Leave empty for no expiration
            </p>
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
