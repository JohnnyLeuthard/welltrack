import { z } from 'zod';

export const createMedicationLogSchema = z.object({
  medicationId: z.string().min(1, 'medicationId is required'),
  taken: z.boolean().optional(),
  takenAt: z.string().optional(),
  notes: z.string().optional(),
});

export const updateMedicationLogSchema = z.object({
  taken: z.boolean().optional(),
  takenAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
