import { z } from 'zod';

export const createMedicationSchema = z.object({
  name: z.string().min(1, 'name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1, 'name must be a non-empty string').optional(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
