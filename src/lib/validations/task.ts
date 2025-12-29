import { z } from "zod";
import { TaskStatus, TaskPriority, TaskSize, AssignedByType } from "@prisma/client";

// Helper to normalize datetime-local input
// Accepts: "YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss", or Date objects
const datetimeLocalSchema = z
  .string()
  .refine(
    (val) => {
      // Match datetime-local format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
      const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
      if (!pattern.test(val)) return false;
      // Verify it's a valid date
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Invalid date format" }
  )
  .or(z.date());

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().max(5000, "Description too long").optional(),
  priority: z.nativeEnum(TaskPriority),
  size: z.nativeEnum(TaskSize),
  kpiBucketId: z.string().min(1, "KPI bucket is required"),
  estimatedMinutes: z
    .number()
    .int()
    .min(5, "Minimum 5 minutes")
    .max(480, "Maximum 8 hours"),
  deadline: datetimeLocalSchema,
  startDate: datetimeLocalSchema.optional(),
  assigneeId: z.string().optional(), // For managers assigning to subordinates
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z.string().max(5000, "Description too long").optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  size: z.nativeEnum(TaskSize).optional(),
  kpiBucketId: z.string().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .min(5, "Minimum 5 minutes")
    .max(480, "Maximum 8 hours")
    .optional(),
  actualMinutes: z.number().int().min(0).optional(),
  deadline: datetimeLocalSchema.optional(),
  startDate: datetimeLocalSchema.optional().nullable(),
});

export const transitionTaskSchema = z.object({
  toStatus: z.nativeEnum(TaskStatus),
  reason: z.string().min(10, "Reason must be at least 10 characters").optional(),
  onHoldReason: z.string().min(10, "On-hold reason must be at least 10 characters").optional(),
});

export const taskQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  kpiBucketId: z.string().optional(),
  ownerId: z.string().optional(),
  assignerId: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "deadline", "priority", "status", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TransitionTaskInput = z.infer<typeof transitionTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
