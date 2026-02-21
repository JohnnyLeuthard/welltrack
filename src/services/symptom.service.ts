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

export async function deleteSymptom(userId: string, symptomId: string): Promise<void> {
  const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });

  if (!symptom) {
    const err = new Error('Symptom not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (symptom.userId === null) {
    const err = new Error('System symptoms cannot be deleted');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  if (symptom.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  await prisma.symptom.delete({ where: { id: symptomId } });
}

export interface UpdateSymptomInput {
  name?: string;
  category?: string | null;
  isActive?: boolean;
}

export async function updateSymptom(
  userId: string,
  symptomId: string,
  input: UpdateSymptomInput,
): Promise<SymptomResult> {
  const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });

  if (!symptom) {
    const err = new Error('Symptom not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (symptom.userId === null) {
    const err = new Error('System symptoms are read-only');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  if (symptom.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.symptom.update({
    where: { id: symptomId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.category !== undefined && {
        category: typeof input.category === 'string' ? input.category.trim() : null,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: { id: true, userId: true, name: true, category: true, isActive: true },
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
