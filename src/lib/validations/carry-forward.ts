import { z } from "zod";

export const carryForwardSchema = z.object({
  newDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must not exceed 500 characters"),
});

export type CarryForwardInput = z.infer<typeof carryForwardSchema>;
