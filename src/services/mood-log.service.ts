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
