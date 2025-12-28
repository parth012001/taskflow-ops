import { z } from "zod";

export const reassignTaskSchema = z.object({
  newOwnerId: z.string().min(1, "New owner is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  newDeadline: z
    .string()
    .datetime()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export type ReassignTaskInput = z.infer<typeof reassignTaskSchema>;
