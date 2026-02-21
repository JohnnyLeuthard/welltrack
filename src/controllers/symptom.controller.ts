import { Request, Response } from 'express';
import { createSymptom, listSymptoms } from '../services/symptom.service';

export async function listSymptomsHandler(req: Request, res: Response): Promise<void> {
  const symptoms = await listSymptoms(req.user!.userId);
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
