import type { Request, Response } from 'express';
import { generateCsv } from '../services/export.service';

export async function exportCsvHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const startParam = req.query['startDate'] as string | undefined;
  const endParam = req.query['endDate'] as string | undefined;

  const startDate = startParam ? new Date(startParam) : undefined;
  const endDate = endParam ? new Date(endParam) : undefined;

  if (startDate && isNaN(startDate.getTime())) {
    res.status(422).json({ error: 'Invalid startDate' });
    return;
  }
  if (endDate && isNaN(endDate.getTime())) {
    res.status(422).json({ error: 'Invalid endDate' });
    return;
  }

  const csv = await generateCsv(userId, startDate, endDate);
  const filename = `welltrack-export-${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
