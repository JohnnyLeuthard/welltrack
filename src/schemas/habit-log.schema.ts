import { z } from 'zod';

export const createHabitLogSchema = z.object({
  habitId: z.string().min(1, 'habitId is required'),
  valueBoolean: z.boolean().optional(),
  valueNumeric: z.number().optional(),
  valueDuration: z.number().int().min(0, 'valueDuration must be a non-negative integer').optional(),
  notes: z.string().optional(),
  loggedAt: z.string().optional(),
});

export const updateHabitLogSchema = z.object({
  valueBoolean: z.boolean().nullable().optional(),
  valueNumeric: z.number().nullable().optional(),
  valueDuration: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  loggedAt: z.string().optional(),
});
