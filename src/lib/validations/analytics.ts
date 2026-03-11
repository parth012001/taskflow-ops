import { z } from "zod";

export const companyTrendsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(4).max(52).default(12),
});

export type CompanyTrendsQuery = z.infer<typeof companyTrendsQuerySchema>;
