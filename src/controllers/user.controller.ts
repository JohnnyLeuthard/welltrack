import { Request, Response } from 'express';
import { getMe, isValidIANATimezone, updateMe } from '../services/user.service';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await getMe(req.user!.userId);
  res.status(200).json(user);
}

export async function updateMeHandler(req: Request, res: Response): Promise<void> {
  const { displayName, timezone } = req.body as Record<string, unknown>;

  if (displayName !== undefined && displayName !== null && typeof displayName !== 'string') {
    res.status(422).json({ error: 'displayName must be a string or null' });
    return;
  }
  if (timezone !== undefined) {
    if (typeof timezone !== 'string') {
      res.status(422).json({ error: 'timezone must be a string' });
      return;
    }
    if (!isValidIANATimezone(timezone)) {
      res.status(422).json({ error: 'timezone must be a valid IANA timezone string' });
      return;
    }
  }

  const input: { displayName?: string | null; timezone?: string } = {};
  if (displayName !== undefined) input.displayName = (displayName as string | null);
  if (timezone !== undefined) input.timezone = timezone as string;

  const user = await updateMe(req.user!.userId, input);
  res.status(200).json(user);
}
