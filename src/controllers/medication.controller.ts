import { Request, Response } from 'express';
import { listMedications } from '../services/medication.service';

export async function listMedicationsHandler(req: Request, res: Response): Promise<void> {
  const medications = await listMedications(req.user!.userId);
  res.status(200).json(medications);
}
