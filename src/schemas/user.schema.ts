import { z } from 'zod';

export const updateMeSchema = z.object({
  displayName: z.string().nullable().optional(),
  pronouns: z.string().nullable().optional(),
  timezone: z.string().optional(),
  email: z.string().email().optional(),
  weeklyDigestOptIn: z.boolean().optional(),
});
