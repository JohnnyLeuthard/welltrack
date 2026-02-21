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

export interface CreateSymptomInput {
  name: string;
  category?: string;
}

export async function createSymptom(
  userId: string,
  input: CreateSymptomInput,
): Promise<SymptomResult> {
  return prisma.symptom.create({
    data: {
      userId,
      name: input.name.trim(),
      category: input.category?.trim() ?? null,
    },
    select: { id: true, userId: true, name: true, category: true, isActive: true },
  });
}
