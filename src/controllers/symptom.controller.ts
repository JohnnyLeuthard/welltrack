import { Request, Response } from 'express';
import { listSymptoms } from '../services/symptom.service';

export async function listSymptomsHandler(req: Request, res: Response): Promise<void> {
  const symptoms = await listSymptoms(req.user!.userId);
  res.status(200).json(symptoms);
}
