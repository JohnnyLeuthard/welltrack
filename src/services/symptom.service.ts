import prisma from '../lib/prisma';

export interface SymptomResult {
  id: string;
  userId: string | null;
  name: string;
  category: string | null;
  isActive: boolean;
}

export async function listSymptoms(userId: string): Promise<SymptomResult[]> {
  return prisma.symptom.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
    },
    select: { id: true, userId: true, name: true, category: true, isActive: true },
    orderBy: [{ name: 'asc' }],
  });
}
