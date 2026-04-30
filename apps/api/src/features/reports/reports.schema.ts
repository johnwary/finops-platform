import { z } from 'zod';

export const periodSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
});

export type PeriodInput = z.infer<typeof periodSchema>;
