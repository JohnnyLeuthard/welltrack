import { Request, Response } from 'express';
import { createSymptomLog, deleteSymptomLog, listSymptomLogs, updateSymptomLog } from '../services/symptom-log.service';

export async function listSymptomLogsHandler(req: Request, res: Response): Promise<void> {
  const { startDate, endDate, limit, offset } = req.query as Record<string, string | undefined>;

  // Parse and validate startDate
  let parsedStart: Date | undefined;
  if (startDate !== undefined) {
    parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      res.status(422).json({ error: 'startDate must be a valid ISO 8601 date string' });
      return;
    }
  }

  // Parse and validate endDate
  let parsedEnd: Date | undefined;
  if (endDate !== undefined) {
    parsedEnd = new Date(endDate);
    if (isNaN(parsedEnd.getTime())) {
      res.status(422).json({ error: 'endDate must be a valid ISO 8601 date string' });
      return;
    }
  }

  // Parse and validate limit
  let parsedLimit: number | undefined;
  if (limit !== undefined) {
    parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      res.status(422).json({ error: 'limit must be a positive integer' });
      return;
    }
  }

  // Parse and validate offset
  let parsedOffset: number | undefined;
  if (offset !== undefined) {
    parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(422).json({ error: 'offset must be a non-negative integer' });
      return;
    }
  }

  const logs = await listSymptomLogs(req.user!.userId, {
    startDate: parsedStart,
    endDate: parsedEnd,
    limit: parsedLimit,
    offset: parsedOffset,
  });

  res.status(200).json(logs);
}

export async function createSymptomLogHandler(req: Request, res: Response): Promise<void> {
  const { symptomId, severity, notes, loggedAt } = req.body as Record<string, unknown>;

  if (typeof symptomId !== 'string' || symptomId.trim().length === 0) {
    res.status(422).json({ error: 'symptomId is required' });
    return;
  }
  if (typeof severity !== 'number' || !Number.isInteger(severity) || severity < 1 || severity > 10) {
    res.status(422).json({ error: 'severity must be an integer between 1 and 10' });
    return;
  }
  if (notes !== undefined && typeof notes !== 'string') {
    res.status(422).json({ error: 'notes must be a string' });
    return;
  }

  let parsedLoggedAt: Date | undefined;
  if (loggedAt !== undefined) {
    parsedLoggedAt = new Date(loggedAt as string);
    if (isNaN(parsedLoggedAt.getTime())) {
      res.status(422).json({ error: 'loggedAt must be a valid ISO 8601 date string' });
      return;
    }
  }

  try {
    const log = await createSymptomLog(req.user!.userId, {
      symptomId: symptomId.trim(),
      severity,
      notes: typeof notes === 'string' ? notes : undefined,
      loggedAt: parsedLoggedAt,
    });
    res.status(201).json(log);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}

export async function deleteSymptomLogHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    await deleteSymptomLog(req.user!.userId, id);
    res.status(204).send();
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ error: (err as Error).message });
      return;
    }
    if (status === 403) {
      res.status(403).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}

export async function updateSymptomLogHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { severity, notes, loggedAt } = req.body as Record<string, unknown>;

  if (
    severity !== undefined &&
    (typeof severity !== 'number' || !Number.isInteger(severity) || severity < 1 || severity > 10)
  ) {
    res.status(422).json({ error: 'severity must be an integer between 1 and 10' });
    return;
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    res.status(422).json({ error: 'notes must be a string or null' });
    return;
  }

  let parsedLoggedAt: Date | undefined;
  if (loggedAt !== undefined) {
    parsedLoggedAt = new Date(loggedAt as string);
    if (isNaN(parsedLoggedAt.getTime())) {
      res.status(422).json({ error: 'loggedAt must be a valid ISO 8601 date string' });
      return;
    }
  }

  try {
    const input: { severity?: number; notes?: string | null; loggedAt?: Date } = {};
    if (severity !== undefined) input.severity = severity as number;
    if (notes !== undefined) input.notes = notes as string | null;
    if (parsedLoggedAt !== undefined) input.loggedAt = parsedLoggedAt;

    const log = await updateSymptomLog(req.user!.userId, id, input);
    res.status(200).json(log);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ error: (err as Error).message });
      return;
    }
    if (status === 403) {
      res.status(403).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}
