import { Request, Response } from 'express';
import {
  createMedicationLog,
  deleteMedicationLog,
  listMedicationLogs,
  updateMedicationLog,
} from '../services/medication-log.service';

export async function listMedicationLogsHandler(req: Request, res: Response): Promise<void> {
  const { startDate, endDate, limit, offset } = req.query as Record<string, string | undefined>;

  let parsedStart: Date | undefined;
  if (startDate !== undefined) {
    parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      res.status(422).json({ error: 'startDate must be a valid ISO 8601 date string' });
      return;
    }
  }

  let parsedEnd: Date | undefined;
  if (endDate !== undefined) {
    parsedEnd = new Date(endDate);
    if (isNaN(parsedEnd.getTime())) {
      res.status(422).json({ error: 'endDate must be a valid ISO 8601 date string' });
      return;
    }
  }

  let parsedLimit: number | undefined;
  if (limit !== undefined) {
    parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      res.status(422).json({ error: 'limit must be a positive integer' });
      return;
    }
  }

  let parsedOffset: number | undefined;
  if (offset !== undefined) {
    parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(422).json({ error: 'offset must be a non-negative integer' });
      return;
    }
  }

  const logs = await listMedicationLogs(req.user!.userId, {
    startDate: parsedStart,
    endDate: parsedEnd,
    limit: parsedLimit,
    offset: parsedOffset,
  });

  res.status(200).json(logs);
}

export async function createMedicationLogHandler(req: Request, res: Response): Promise<void> {
  const { medicationId, taken, takenAt, notes } = req.body as Record<string, unknown>;

  if (typeof medicationId !== 'string' || medicationId.trim().length === 0) {
    res.status(422).json({ error: 'medicationId is required' });
    return;
  }
  if (taken !== undefined && typeof taken !== 'boolean') {
    res.status(422).json({ error: 'taken must be a boolean' });
    return;
  }
  if (notes !== undefined && typeof notes !== 'string') {
    res.status(422).json({ error: 'notes must be a string' });
    return;
  }

  let parsedTakenAt: Date | undefined;
  if (takenAt !== undefined) {
    parsedTakenAt = new Date(takenAt as string);
    if (isNaN(parsedTakenAt.getTime())) {
      res.status(422).json({ error: 'takenAt must be a valid ISO 8601 date string' });
      return;
    }
  }

  try {
    const log = await createMedicationLog(req.user!.userId, {
      medicationId: medicationId.trim(),
      taken: taken as boolean | undefined,
      takenAt: parsedTakenAt,
      notes: notes as string | undefined,
    });
    res.status(201).json(log);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    throw err;
  }
}

export async function updateMedicationLogHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { taken, takenAt, notes } = req.body as Record<string, unknown>;

  if (taken !== undefined && typeof taken !== 'boolean') {
    res.status(422).json({ error: 'taken must be a boolean' });
    return;
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    res.status(422).json({ error: 'notes must be a string or null' });
    return;
  }

  let parsedTakenAt: Date | null | undefined;
  if (takenAt !== undefined) {
    if (takenAt === null) {
      parsedTakenAt = null;
    } else {
      parsedTakenAt = new Date(takenAt as string);
      if (isNaN(parsedTakenAt.getTime())) {
        res.status(422).json({ error: 'takenAt must be a valid ISO 8601 date string or null' });
        return;
      }
    }
  }

  try {
    const input: Parameters<typeof updateMedicationLog>[2] = {};
    if (taken !== undefined) input.taken = taken as boolean;
    if (takenAt !== undefined) input.takenAt = parsedTakenAt as Date | null;
    if (notes !== undefined) input.notes = notes as string | null;

    const log = await updateMedicationLog(req.user!.userId, id, input);
    res.status(200).json(log);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}

export async function deleteMedicationLogHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    await deleteMedicationLog(req.user!.userId, id);
    res.status(204).send();
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}
