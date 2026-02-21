import prisma from '../lib/prisma';

export interface MoodLogResult {
  id: string;
  userId: string;
  moodScore: number;
  energyLevel: number | null;
  stressLevel: number | null;
  notes: string | null;
  loggedAt: Date;
  createdAt: Date;
}

export interface ListMoodLogsOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface UpdateMoodLogInput {
  moodScore?: number;
  energyLevel?: number | null;
  stressLevel?: number | null;
  notes?: string | null;
  loggedAt?: Date;
}

export async function updateMoodLog(
  userId: string,
  logId: string,
  input: UpdateMoodLogInput,
): Promise<MoodLogResult> {
  const log = await prisma.moodLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Mood log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.moodLog.update({
    where: { id: logId },
    data: {
      ...(input.moodScore !== undefined && { moodScore: input.moodScore }),
      ...(input.energyLevel !== undefined && { energyLevel: input.energyLevel }),
      ...(input.stressLevel !== undefined && { stressLevel: input.stressLevel }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.loggedAt !== undefined && { loggedAt: input.loggedAt }),
    },
    select: {
      id: true,
      userId: true,
      moodScore: true,
      energyLevel: true,
      stressLevel: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
    },
  });
}

export interface CreateMoodLogInput {
  moodScore: number;
  energyLevel?: number;
  stressLevel?: number;
  notes?: string;
  loggedAt?: Date;
}

export async function createMoodLog(
  userId: string,
  input: CreateMoodLogInput,
): Promise<MoodLogResult> {
  return prisma.moodLog.create({
    data: {
      userId,
      moodScore: input.moodScore,
      energyLevel: input.energyLevel ?? null,
      stressLevel: input.stressLevel ?? null,
      notes: input.notes ?? null,
      loggedAt: input.loggedAt ?? new Date(),
    },
    select: {
      id: true,
      userId: true,
      moodScore: true,
      energyLevel: true,
      stressLevel: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
    },
  });
}

export async function listMoodLogs(
  userId: string,
  opts: ListMoodLogsOptions = {},
): Promise<MoodLogResult[]> {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = opts.offset ?? 0;

  return prisma.moodLog.findMany({
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
      moodScore: true,
      energyLevel: true,
      stressLevel: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
    },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
