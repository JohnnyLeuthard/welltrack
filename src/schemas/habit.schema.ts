import { z } from 'zod';

export const createHabitSchema = z.object({
  name: z.string().min(1, 'name is required'),
  trackingType: z.enum(['boolean', 'numeric', 'duration'] as const, {
    error: 'trackingType must be one of: boolean, numeric, duration',
  }),
  unit: z.string().optional(),
});

export const updateHabitSchema = z.object({
  name: z.string().min(1, 'name must be a non-empty string').optional(),
  unit: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
