import type { Request, Response } from 'express';
import { getActivity, getMoodTrend, getSymptomTrend } from '../services/insights.service';

const VALID_DAYS = [7, 30, 90];
const MOOD_METRICS = ['mood', 'energy', 'stress'] as const;

export async function getTrends(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const type = req.query['type'] as string | undefined;
  const daysParam = Number(req.query['days']);
  const days = VALID_DAYS.includes(daysParam) ? daysParam : 30;

  if (!type) {
    res.status(422).json({ error: 'type is required' });
    return;
  }

  try {
    if ((MOOD_METRICS as readonly string[]).includes(type)) {
      const data = await getMoodTrend(userId, type as 'mood' | 'energy' | 'stress', days);
      res.json(data);
    } else {
      const data = await getSymptomTrend(userId, type, days);
      res.json(data);
    }
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({ error: (err as Error).message });
  }
}

export async function getActivitySummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const daysParam = Number(req.query['days']);
  const days = VALID_DAYS.includes(daysParam) ? daysParam : 30;

  try {
    const data = await getActivity(userId, days);
    res.json(data);
  } catch (err) {
    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({ error: (err as Error).message });
  }
}
