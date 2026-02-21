import prisma from '../lib/prisma';

export interface MedicationLogResult {
  id: string;
  userId: string;
  medicationId: string;
  taken: boolean;
  takenAt: Date | null;
  notes: string | null;
  createdAt: Date;
  medication: { id: string; name: string; dosage: string | null };
}

export interface ListMedicationLogsOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function listMedicationLogs(
  userId: string,
  opts: ListMedicationLogsOptions = {},
): Promise<MedicationLogResult[]> {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = opts.offset ?? 0;

  return prisma.medicationLog.findMany({
    where: {
      userId,
      ...(opts.startDate || opts.endDate
        ? {
            createdAt: {
              ...(opts.startDate && { gte: opts.startDate }),
              ...(opts.endDate && { lte: opts.endDate }),
            },
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      medicationId: true,
      taken: true,
      takenAt: true,
      notes: true,
      createdAt: true,
      medication: { select: { id: true, name: true, dosage: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export interface CreateMedicationLogInput {
  medicationId: string;
  taken?: boolean;
  takenAt?: Date;
  notes?: string;
}

export async function createMedicationLog(
  userId: string,
  input: CreateMedicationLogInput,
): Promise<MedicationLogResult> {
  const med = await prisma.medication.findUnique({ where: { id: input.medicationId } });
  if (!med || med.userId !== userId) {
    const err = new Error('Medication not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  return prisma.medicationLog.create({
    data: {
      userId,
      medicationId: input.medicationId,
      taken: input.taken ?? true,
      takenAt: input.takenAt ?? null,
      notes: input.notes ?? null,
    },
    select: {
      id: true,
      userId: true,
      medicationId: true,
      taken: true,
      takenAt: true,
      notes: true,
      createdAt: true,
      medication: { select: { id: true, name: true, dosage: true } },
    },
  });
}

export interface UpdateMedicationLogInput {
  taken?: boolean;
  takenAt?: Date | null;
  notes?: string | null;
}

export async function updateMedicationLog(
  userId: string,
  logId: string,
  input: UpdateMedicationLogInput,
): Promise<MedicationLogResult> {
  const log = await prisma.medicationLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Medication log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  return prisma.medicationLog.update({
    where: { id: logId },
    data: {
      ...(input.taken !== undefined && { taken: input.taken }),
      ...(input.takenAt !== undefined && { takenAt: input.takenAt }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    select: {
      id: true,
      userId: true,
      medicationId: true,
      taken: true,
      takenAt: true,
      notes: true,
      createdAt: true,
      medication: { select: { id: true, name: true, dosage: true } },
    },
  });
}

export async function deleteMedicationLog(userId: string, logId: string): Promise<void> {
  const log = await prisma.medicationLog.findUnique({ where: { id: logId } });

  if (!log) {
    const err = new Error('Medication log not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  if (log.userId !== userId) {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  await prisma.medicationLog.delete({ where: { id: logId } });
}
