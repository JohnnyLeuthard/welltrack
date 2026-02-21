import { Request, Response } from 'express';
import { createHabit, deleteHabit, listHabits, updateHabit } from '../services/habit.service';

const VALID_TRACKING_TYPES = ['boolean', 'numeric', 'duration'] as const;

export async function listHabitsHandler(req: Request, res: Response): Promise<void> {
  const habits = await listHabits(req.user!.userId);
  res.status(200).json(habits);
}

export async function createHabitHandler(req: Request, res: Response): Promise<void> {
  const { name, trackingType, unit } = req.body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(422).json({ error: 'name is required' });
    return;
  }
  if (!VALID_TRACKING_TYPES.includes(trackingType as (typeof VALID_TRACKING_TYPES)[number])) {
    res.status(422).json({ error: 'trackingType must be one of: boolean, numeric, duration' });
    return;
  }
  if (unit !== undefined && typeof unit !== 'string') {
    res.status(422).json({ error: 'unit must be a string' });
    return;
  }

  const habit = await createHabit(req.user!.userId, {
    name: name as string,
    trackingType: trackingType as 'boolean' | 'numeric' | 'duration',
    unit: unit as string | undefined,
  });

  res.status(201).json(habit);
}

export async function updateHabitHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { name, unit, isActive } = req.body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== 'string' || (name as string).trim().length === 0)) {
    res.status(422).json({ error: 'name must be a non-empty string' });
    return;
  }
  if (unit !== undefined && unit !== null && typeof unit !== 'string') {
    res.status(422).json({ error: 'unit must be a string or null' });
    return;
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    res.status(422).json({ error: 'isActive must be a boolean' });
    return;
  }

  try {
    const input: Parameters<typeof updateHabit>[2] = {};
    if (name !== undefined) input.name = name as string;
    if (unit !== undefined) input.unit = unit as string | null;
    if (isActive !== undefined) input.isActive = isActive as boolean;

    const habit = await updateHabit(req.user!.userId, id, input);
    res.status(200).json(habit);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}

export async function deleteHabitHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    await deleteHabit(req.user!.userId, id);
    res.status(204).send();
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}
