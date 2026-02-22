import { Request, Response } from 'express';
import { getAuditLog } from '../services/audit.service';

export async function getAuditLogHandler(req: Request, res: Response): Promise<void> {
  const entries = await getAuditLog(req.user!.userId);
  res.status(200).json(entries);
}
