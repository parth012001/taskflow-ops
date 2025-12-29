import { z } from "zod";

export const announcementTypeEnum = z.enum(["GENERAL", "BIRTHDAY", "EVENT", "POLICY"]);
export const announcementPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH"]);

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(5000, "Content must be less than 5000 characters"),
  type: announcementTypeEnum.default("GENERAL"),
  priority: announcementPriorityEnum.default("NORMAL"),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const announcementQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  activeOnly: z.coerce.boolean().default(true),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementQueryInput = z.infer<typeof announcementQuerySchema>;
