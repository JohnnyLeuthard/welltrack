import { z } from 'zod';

export const createSymptomLogSchema = z.object({
  symptomId: z.string().min(1, 'symptomId is required'),
  severity: z
    .number()
    .int('severity must be an integer between 1 and 10')
    .min(1, 'severity must be an integer between 1 and 10')
    .max(10, 'severity must be an integer between 1 and 10'),
  notes: z.string().optional(),
  loggedAt: z.string().optional(),
});

export const updateSymptomLogSchema = z.object({
  severity: z
    .number()
    .int('severity must be an integer between 1 and 10')
    .min(1, 'severity must be an integer between 1 and 10')
    .max(10, 'severity must be an integer between 1 and 10')
    .optional(),
  notes: z.string().nullable().optional(),
  loggedAt: z.string().optional(),
});
