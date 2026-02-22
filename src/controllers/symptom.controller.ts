import { Request, Response } from 'express';
import { createSymptom, deleteSymptom, listSymptoms, updateSymptom } from '../services/symptom.service';

export async function listSymptomsHandler(req: Request, res: Response): Promise<void> {
  const { limit, offset } = req.query as Record<string, string | undefined>;

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

  const symptoms = await listSymptoms(req.user!.userId, { limit: parsedLimit, offset: parsedOffset });
  res.status(200).json(symptoms);
}

export async function createSymptomHandler(req: Request, res: Response): Promise<void> {
  const { name, category } = req.body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(422).json({ error: 'name is required' });
    return;
  }
  if (category !== undefined && typeof category !== 'string') {
    res.status(422).json({ error: 'category must be a string' });
    return;
  }

  const symptom = await createSymptom(req.user!.userId, {
    name,
    category: typeof category === 'string' ? category : undefined,
  });
  res.status(201).json(symptom);
}

export async function updateSymptomHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { name, category, isActive } = req.body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    res.status(422).json({ error: 'name must be a non-empty string' });
    return;
  }
  if (category !== undefined && category !== null && typeof category !== 'string') {
    res.status(422).json({ error: 'category must be a string or null' });
    return;
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    res.status(422).json({ error: 'isActive must be a boolean' });
    return;
  }

  try {
    const input: { name?: string; category?: string | null; isActive?: boolean } = {};
    if (name !== undefined) input.name = name as string;
    if (category !== undefined) input.category = category as string | null;
    if (isActive !== undefined) input.isActive = isActive as boolean;

    const symptom = await updateSymptom(req.user!.userId, id, input);
    res.status(200).json(symptom);
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

export async function deleteSymptomHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    await deleteSymptom(req.user!.userId, id);
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
