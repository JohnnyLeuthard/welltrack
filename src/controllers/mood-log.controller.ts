import { Request, Response } from 'express';
import { createMoodLog, listMoodLogs } from '../services/mood-log.service';

export async function listMoodLogsHandler(req: Request, res: Response): Promise<void> {
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

  const logs = await listMoodLogs(req.user!.userId, {
    startDate: parsedStart,
    endDate: parsedEnd,
    limit: parsedLimit,
    offset: parsedOffset,
  });

  res.status(200).json(logs);
}

function isValidScore(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
}

export async function createMoodLogHandler(req: Request, res: Response): Promise<void> {
  const { moodScore, energyLevel, stressLevel, notes, loggedAt } = req.body as Record<
    string,
    unknown
  >;

  if (!isValidScore(moodScore)) {
    res.status(422).json({ error: 'moodScore must be an integer between 1 and 5' });
    return;
  }
  if (energyLevel !== undefined && !isValidScore(energyLevel)) {
    res.status(422).json({ error: 'energyLevel must be an integer between 1 and 5' });
    return;
  }
  if (stressLevel !== undefined && !isValidScore(stressLevel)) {
    res.status(422).json({ error: 'stressLevel must be an integer between 1 and 5' });
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

  const log = await createMoodLog(req.user!.userId, {
    moodScore: moodScore as number,
    energyLevel: energyLevel as number | undefined,
    stressLevel: stressLevel as number | undefined,
    notes: notes as string | undefined,
    loggedAt: parsedLoggedAt,
  });

  res.status(201).json(log);
}
