import { Request, Response } from 'express';
import {
  createHabitLog,
  deleteHabitLog,
  listHabitLogs,
  updateHabitLog,
} from '../services/habit-log.service';

export async function listHabitLogsHandler(req: Request, res: Response): Promise<void> {
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

  const logs = await listHabitLogs(req.user!.userId, {
    startDate: parsedStart,
    endDate: parsedEnd,
    limit: parsedLimit,
    offset: parsedOffset,
  });

  res.status(200).json(logs);
}

export async function createHabitLogHandler(req: Request, res: Response): Promise<void> {
  const { habitId, valueBoolean, valueNumeric, valueDuration, notes, loggedAt } =
    req.body as Record<string, unknown>;

  if (typeof habitId !== 'string' || habitId.trim().length === 0) {
    res.status(422).json({ error: 'habitId is required' });
    return;
  }
  if (valueBoolean !== undefined && typeof valueBoolean !== 'boolean') {
    res.status(422).json({ error: 'valueBoolean must be a boolean' });
    return;
  }
  if (valueNumeric !== undefined && typeof valueNumeric !== 'number') {
    res.status(422).json({ error: 'valueNumeric must be a number' });
    return;
  }
  if (valueDuration !== undefined && (typeof valueDuration !== 'number' || !Number.isInteger(valueDuration) || (valueDuration as number) < 0)) {
    res.status(422).json({ error: 'valueDuration must be a non-negative integer' });
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
    const log = await createHabitLog(req.user!.userId, {
      habitId: habitId.trim(),
      valueBoolean: valueBoolean as boolean | undefined,
      valueNumeric: valueNumeric as number | undefined,
      valueDuration: valueDuration as number | undefined,
      notes: notes as string | undefined,
      loggedAt: parsedLoggedAt,
    });
    res.status(201).json(log);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 422) { res.status(422).json({ error: (err as Error).message }); return; }
    throw err;
  }
}

export async function updateHabitLogHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { valueBoolean, valueNumeric, valueDuration, notes, loggedAt } =
    req.body as Record<string, unknown>;

  if (valueBoolean !== undefined && valueBoolean !== null && typeof valueBoolean !== 'boolean') {
    res.status(422).json({ error: 'valueBoolean must be a boolean or null' });
    return;
  }
  if (valueNumeric !== undefined && valueNumeric !== null && typeof valueNumeric !== 'number') {
    res.status(422).json({ error: 'valueNumeric must be a number or null' });
    return;
  }
  if (valueDuration !== undefined && valueDuration !== null && (typeof valueDuration !== 'number' || !Number.isInteger(valueDuration as number))) {
    res.status(422).json({ error: 'valueDuration must be a non-negative integer or null' });
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
    const input: Parameters<typeof updateHabitLog>[2] = {};
    if (valueBoolean !== undefined) input.valueBoolean = valueBoolean as boolean | null;
    if (valueNumeric !== undefined) input.valueNumeric = valueNumeric as number | null;
    if (valueDuration !== undefined) input.valueDuration = valueDuration as number | null;
    if (notes !== undefined) input.notes = notes as string | null;
    if (parsedLoggedAt !== undefined) input.loggedAt = parsedLoggedAt;

    const log = await updateHabitLog(req.user!.userId, id, input);
    res.status(200).json(log);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}

export async function deleteHabitLogHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    await deleteHabitLog(req.user!.userId, id);
    res.status(204).send();
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}
