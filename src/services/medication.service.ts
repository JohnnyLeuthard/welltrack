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

export interface UpdateMedicationInput {
  name?: string;
  dosage?: string | null;
  frequency?: string | null;
  isActive?: boolean;
}

export async function updateMedication(
  userId: string,
  medicationId: string,
  input: UpdateMedicationInput,
): Promise<MedicationResult> {
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });

  if (!med) {
    const err = new Error('Medication not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (med.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.medication.update({
    where: { id: medicationId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.dosage !== undefined && {
        dosage: typeof input.dosage === 'string' ? input.dosage.trim() : null,
      }),
      ...(input.frequency !== undefined && {
        frequency: typeof input.frequency === 'string' ? input.frequency.trim() : null,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
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

export async function deleteMedication(userId: string, medicationId: string): Promise<void> {
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });

  if (!med) {
    const err = new Error('Medication not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (med.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  await prisma.medication.delete({ where: { id: medicationId } });
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

export async function listMedications(
  userId: string,
  includeAll = false,
): Promise<MedicationResult[]> {
  return prisma.medication.findMany({
    where: { userId, ...(includeAll ? {} : { isActive: true }) },
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
