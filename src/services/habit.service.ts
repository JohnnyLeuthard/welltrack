import prisma from '../lib/prisma';

export type TrackingType = 'boolean' | 'numeric' | 'duration';

export interface HabitResult {
  id: string;
  userId: string | null;
  name: string;
  trackingType: TrackingType;
  unit: string | null;
  isActive: boolean;
}

export async function listHabits(userId: string): Promise<HabitResult[]> {
  return prisma.habit.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
    },
    select: { id: true, userId: true, name: true, trackingType: true, unit: true, isActive: true },
    orderBy: { name: 'asc' },
  }) as Promise<HabitResult[]>;
}

export interface CreateHabitInput {
  name: string;
  trackingType: TrackingType;
  unit?: string;
}

export async function createHabit(userId: string, input: CreateHabitInput): Promise<HabitResult> {
  return prisma.habit.create({
    data: {
      userId,
      name: input.name.trim(),
      trackingType: input.trackingType,
      unit: input.unit?.trim() ?? null,
    },
    select: { id: true, userId: true, name: true, trackingType: true, unit: true, isActive: true },
  }) as Promise<HabitResult>;
}

export interface UpdateHabitInput {
  name?: string;
  unit?: string | null;
  isActive?: boolean;
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: UpdateHabitInput,
): Promise<HabitResult> {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });

  if (!habit) {
    const err = new Error('Habit not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (habit.userId === null) {
    const err = new Error('System habits are read-only');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  if (habit.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.habit.update({
    where: { id: habitId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.unit !== undefined && {
        unit: typeof input.unit === 'string' ? input.unit.trim() : null,
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: { id: true, userId: true, name: true, trackingType: true, unit: true, isActive: true },
  }) as Promise<HabitResult>;
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });

  if (!habit) {
    const err = new Error('Habit not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (habit.userId === null) {
    const err = new Error('System habits cannot be deleted');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  if (habit.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  await prisma.habit.delete({ where: { id: habitId } });
}
