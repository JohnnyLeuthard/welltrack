import { Request, Response } from 'express';
import { importCsv } from '../services/import.service';

export async function importCsvHandler(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Send a CSV file as form-data with field name "file".' });
    return;
  }

  const content = req.file.buffer.toString('utf-8');
  const userId = req.user!.userId;

  const result = await importCsv(userId, content);
  res.status(200).json(result);
}
