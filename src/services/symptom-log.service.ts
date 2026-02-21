import prisma from '../lib/prisma';

export interface SymptomLogResult {
  id: string;
  userId: string;
  symptomId: string;
  severity: number;
  notes: string | null;
  loggedAt: Date;
  createdAt: Date;
  symptom: { id: string; name: string; category: string | null };
}

export interface ListSymptomLogsOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function listSymptomLogs(
  userId: string,
  opts: ListSymptomLogsOptions = {},
): Promise<SymptomLogResult[]> {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = opts.offset ?? 0;

  return prisma.symptomLog.findMany({
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
      symptomId: true,
      severity: true,
      notes: true,
      loggedAt: true,
      createdAt: true,
      symptom: { select: { id: true, name: true, category: true } },
    },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
