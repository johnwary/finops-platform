import { z } from 'zod';

export const periodSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
});

// Overdue feeds a collections worklist + CSV export, so the default page is
// generous. Ceiling caps a fat-finger `limit=999999`.
export const overdueSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type PeriodInput = z.infer<typeof periodSchema>;
export type OverdueInput = z.infer<typeof overdueSchema>;
