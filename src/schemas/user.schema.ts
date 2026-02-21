import { z } from 'zod';

export const updateMeSchema = z.object({
  displayName: z.string().nullable().optional(),
  timezone: z.string().optional(),
});
