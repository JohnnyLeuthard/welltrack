import prisma from '../lib/prisma';

export interface HabitLogResult {
  id: string;
  userId: string;
  habitId: string;
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueDuration: number | null;
  notes: string | null;
  loggedAt: Date;
  createdAt: Date;
  habit: { id: string; name: string; trackingType: string; unit: string | null };
}

export interface ListHabitLogsOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function listHabitLogs(
  userId: string,
  opts: ListHabitLogsOptions = {},
): Promise<HabitLogResult[]> {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = opts.offset ?? 0;

  return prisma.habitLog.findMany({
    where: {
      userId,
      ...(opts.startDate || opts.endDate
        ? {
            loggedAt: {
              ...(opts.startDate && { gte: opts.startDate }),
              ...(opts.endDate && { lte: opts.endDate }),
            },
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      habitId: true,
      valueBoolean: true,
      valueNumeric: true,
      valueDuration: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
      habit: { select: { id: true, name: true, trackingType: true, unit: true } },
    },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
  }) as Promise<HabitLogResult[]>;
}

export interface CreateHabitLogInput {
  habitId: string;
  valueBoolean?: boolean;
  valueNumeric?: number;
  valueDuration?: number;
  notes?: string;
  loggedAt?: Date;
}

export async function createHabitLog(
  userId: string,
  input: CreateHabitLogInput,
): Promise<HabitLogResult> {
  // Verify habit is accessible (system or owned)
  const habit = await prisma.habit.findUnique({ where: { id: input.habitId } });
  if (!habit || (habit.userId !== null && habit.userId !== userId)) {
    const err = new Error('Habit not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  // Validate that the correct value field is populated for the trackingType
  const type = habit.trackingType;
  if (type === 'boolean' && input.valueBoolean === undefined) {
    const err = new Error('valueBoolean is required for boolean habits');
    (err as Error & { status: number }).status = 422;
    throw err;
  }
  if (type === 'numeric' && input.valueNumeric === undefined) {
    const err = new Error('valueNumeric is required for numeric habits');
    (err as Error & { status: number }).status = 422;
    throw err;
  }
  if (type === 'duration' && input.valueDuration === undefined) {
    const err = new Error('valueDuration is required for duration habits');
    (err as Error & { status: number }).status = 422;
    throw err;
  }

  return prisma.habitLog.create({
    data: {
      userId,
      habitId: input.habitId,
      valueBoolean: input.valueBoolean ?? null,
      valueNumeric: input.valueNumeric ?? null,
      valueDuration: input.valueDuration ?? null,
      notes: input.notes ?? null,
      loggedAt: input.loggedAt ?? new Date(),
    },
    select: {
      id: true,
      userId: true,
      habitId: true,
      valueBoolean: true,
      valueNumeric: true,
      valueDuration: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
      habit: { select: { id: true, name: true, trackingType: true, unit: true } },
    },
  }) as Promise<HabitLogResult>;
}

export interface UpdateHabitLogInput {
  valueBoolean?: boolean | null;
  valueNumeric?: number | null;
  valueDuration?: number | null;
  notes?: string | null;
  loggedAt?: Date;
}

export async function updateHabitLog(
  userId: string,
  logId: string,
  input: UpdateHabitLogInput,
): Promise<HabitLogResult> {
  const log = await prisma.habitLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Habit log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.habitLog.update({
    where: { id: logId },
    data: {
      ...(input.valueBoolean !== undefined && { valueBoolean: input.valueBoolean }),
      ...(input.valueNumeric !== undefined && { valueNumeric: input.valueNumeric }),
      ...(input.valueDuration !== undefined && { valueDuration: input.valueDuration }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.loggedAt !== undefined && { loggedAt: input.loggedAt }),
    },
    select: {
      id: true,
      userId: true,
      habitId: true,
      valueBoolean: true,
      valueNumeric: true,
      valueDuration: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
      habit: { select: { id: true, name: true, trackingType: true, unit: true } },
    },
  }) as Promise<HabitLogResult>;
}

export async function deleteHabitLog(userId: string, logId: string): Promise<void> {
  const log = await prisma.habitLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Habit log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  await prisma.habitLog.delete({ where: { id: logId } });
}
