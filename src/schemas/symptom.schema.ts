import { z } from 'zod';

export const createSymptomSchema = z.object({
  name: z.string().min(1, 'name is required'),
  category: z.string().optional(),
});

export const updateSymptomSchema = z.object({
  name: z.string().min(1, 'name must be a non-empty string').optional(),
  category: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
