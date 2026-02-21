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

export interface UpdateSymptomLogInput {
  severity?: number;
  notes?: string | null;
  loggedAt?: Date;
}

export async function updateSymptomLog(
  userId: string,
  logId: string,
  input: UpdateSymptomLogInput,
): Promise<SymptomLogResult> {
  const log = await prisma.symptomLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Symptom log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.symptomLog.update({
    where: { id: logId },
    data: {
      ...(input.severity !== undefined && { severity: input.severity }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.loggedAt !== undefined && { loggedAt: input.loggedAt }),
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
  });
}

export interface CreateSymptomLogInput {
  symptomId: string;
  severity: number;
  notes?: string;
  loggedAt?: Date;
}

export async function createSymptomLog(
  userId: string,
  input: CreateSymptomLogInput,
): Promise<SymptomLogResult> {
  // Verify the symptom is accessible to this user (system or owned)
  const symptom = await prisma.symptom.findUnique({ where: { id: input.symptomId } });
  if (!symptom || (symptom.userId !== null && symptom.userId !== userId)) {
    const err = new Error('Symptom not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  return prisma.symptomLog.create({
    data: {
      userId,
      symptomId: input.symptomId,
      severity: input.severity,
      notes: input.notes ?? null,
      loggedAt: input.loggedAt ?? new Date(),
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
  });
}

export async function deleteSymptomLog(userId: string, logId: string): Promise<void> {
  const log = await prisma.symptomLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Symptom log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  await prisma.symptomLog.delete({ where: { id: logId } });
}

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
