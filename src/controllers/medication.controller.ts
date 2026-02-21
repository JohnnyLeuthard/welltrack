import { Request, Response } from 'express';
import { createMedication, deleteMedication, listMedications, updateMedication } from '../services/medication.service';

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

export async function updateMedicationHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { name, dosage, frequency, isActive } = req.body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== 'string' || (name as string).trim().length === 0)) {
    res.status(422).json({ error: 'name must be a non-empty string' });
    return;
  }
  if (dosage !== undefined && dosage !== null && typeof dosage !== 'string') {
    res.status(422).json({ error: 'dosage must be a string or null' });
    return;
  }
  if (frequency !== undefined && frequency !== null && typeof frequency !== 'string') {
    res.status(422).json({ error: 'frequency must be a string or null' });
    return;
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    res.status(422).json({ error: 'isActive must be a boolean' });
    return;
  }

  try {
    const input: Parameters<typeof updateMedication>[2] = {};
    if (name !== undefined) input.name = name as string;
    if (dosage !== undefined) input.dosage = dosage as string | null;
    if (frequency !== undefined) input.frequency = frequency as string | null;
    if (isActive !== undefined) input.isActive = isActive as boolean;

    const med = await updateMedication(req.user!.userId, id, input);
    res.status(200).json(med);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}

export async function deleteMedicationHandler(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    await deleteMedication(req.user!.userId, id);
    res.status(204).send();
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 404) { res.status(404).json({ error: (err as Error).message }); return; }
    if (status === 403) { res.status(403).json({ error: (err as Error).message }); return; }
    throw err;
  }
}
