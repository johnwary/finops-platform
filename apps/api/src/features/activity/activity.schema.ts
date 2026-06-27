import { z } from 'zod';

export const listActivityLogsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export type ListActivityLogsInput = z.infer<typeof listActivityLogsSchema>;
