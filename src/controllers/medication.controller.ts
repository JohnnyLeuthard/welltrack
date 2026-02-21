import { Request, Response } from 'express';
import { createMedication, listMedications } from '../services/medication.service';

export async function listMedicationsHandler(req: Request, res: Response): Promise<void> {
  const medications = await listMedications(req.user!.userId);
  res.status(200).json(medications);
}

export async function createMedicationHandler(req: Request, res: Response): Promise<void> {
  const { name, dosage, frequency } = req.body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(422).json({ error: 'name is required' });
    return;
  }
  if (dosage !== undefined && typeof dosage !== 'string') {
    res.status(422).json({ error: 'dosage must be a string' });
    return;
  }
  if (frequency !== undefined && typeof frequency !== 'string') {
    res.status(422).json({ error: 'frequency must be a string' });
    return;
  }

  const med = await createMedication(req.user!.userId, {
    name: name as string,
    dosage: dosage as string | undefined,
    frequency: frequency as string | undefined,
  });

  res.status(201).json(med);
}
