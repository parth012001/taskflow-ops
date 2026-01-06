import { z } from "zod";

export const roleEnum = z.enum(["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD"]);

// For creating a new KPI bucket
export const createKpiBucketSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  applicableRoles: z
    .array(roleEnum)
    .min(1, "At least one role must be selected"),
});

// For updating an existing KPI bucket
export const updateKpiBucketSchema = createKpiBucketSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// For assigning a KPI to a user
export const assignKpiSchema = z.object({
  userId: z.string().min(1, "User is required"),
  kpiBucketId: z.string().min(1, "KPI bucket is required"),
  targetValue: z.number().min(0, "Target must be non-negative").optional().nullable(),
});

// For updating a KPI assignment (target value)
export const updateKpiAssignmentSchema = z.object({
  targetValue: z.number().min(0, "Target must be non-negative").optional().nullable(),
});

export type CreateKpiBucketInput = z.infer<typeof createKpiBucketSchema>;
export type UpdateKpiBucketInput = z.infer<typeof updateKpiBucketSchema>;
export type AssignKpiInput = z.infer<typeof assignKpiSchema>;
export type UpdateKpiAssignmentInput = z.infer<typeof updateKpiAssignmentSchema>;
