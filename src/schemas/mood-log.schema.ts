import { z } from 'zod';

const scoreField = z
  .number()
  .int()
  .min(1)
  .max(5);

export const createMoodLogSchema = z.object({
  moodScore: scoreField.refine((v) => v >= 1 && v <= 5, {
    message: 'moodScore must be an integer between 1 and 5',
  }),
  energyLevel: scoreField.optional(),
  stressLevel: scoreField.optional(),
  notes: z.string().optional(),
  loggedAt: z.string().optional(),
});

export const updateMoodLogSchema = z.object({
  moodScore: scoreField.optional(),
  energyLevel: scoreField.nullable().optional(),
  stressLevel: scoreField.nullable().optional(),
  notes: z.string().nullable().optional(),
  loggedAt: z.string().optional(),
});
