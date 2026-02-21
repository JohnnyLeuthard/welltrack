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
