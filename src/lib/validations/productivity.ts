import { z } from "zod";
import { Role } from "@prisma/client";

export const productivityScoresQuerySchema = z.object({
  departmentId: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  sortBy: z
    .enum(["composite", "output", "quality", "reliability", "consistency"])
    .default("composite"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productivityTrendsQuerySchema = z.object({
  userId: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(52).default(12),
});

export const updateScoringConfigSchema = z
  .object({
    weeklyOutputTarget: z.number().int().min(1).max(100).optional(),
    outputWeight: z.number().min(0).max(1).optional(),
    qualityWeight: z.number().min(0).max(1).optional(),
    reliabilityWeight: z.number().min(0).max(1).optional(),
    consistencyWeight: z.number().min(0).max(1).optional(),
  })
  .refine(
    (data) => {
      const weights = [
        data.outputWeight,
        data.qualityWeight,
        data.reliabilityWeight,
        data.consistencyWeight,
      ].filter((v) => v !== undefined);
      if (weights.length > 0 && weights.length < 4) return false;
      if (weights.length === 4) {
        const sum = weights.reduce((a, b) => a + b!, 0);
        return Math.abs(sum - 1) < 0.01;
      }
      return true;
    },
    { message: "All 4 weights must be provided and sum to 1.0" }
  );

export type ProductivityScoresQuery = z.infer<typeof productivityScoresQuerySchema>;
export type ProductivityTrendsQuery = z.infer<typeof productivityTrendsQuerySchema>;
export type UpdateScoringConfig = z.infer<typeof updateScoringConfigSchema>;
