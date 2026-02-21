import prisma from '../lib/prisma';

export interface MedicationResult {
  id: string;
  userId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateMedicationInput {
  name: string;
  dosage?: string;
  frequency?: string;
}

export async function createMedication(
  userId: string,
  input: CreateMedicationInput,
): Promise<MedicationResult> {
  return prisma.medication.create({
    data: {
      userId,
      name: input.name.trim(),
      dosage: input.dosage?.trim() ?? null,
      frequency: input.frequency?.trim() ?? null,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      dosage: true,
      frequency: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function listMedications(userId: string): Promise<MedicationResult[]> {
  return prisma.medication.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      userId: true,
      name: true,
      dosage: true,
      frequency: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
}
