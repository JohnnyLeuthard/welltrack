import { Request, Response } from 'express';
import { deleteMe, getMe, isValidIANATimezone, updateMe } from '../services/user.service';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await getMe(req.user!.userId);
  res.status(200).json(user);
}

export async function updateMeHandler(req: Request, res: Response): Promise<void> {
  const { displayName, timezone, email } = req.body as Record<string, unknown>;

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

  const input: { displayName?: string | null; timezone?: string; email?: string } = {};
  if (displayName !== undefined) input.displayName = (displayName as string | null);
  if (timezone !== undefined) input.timezone = timezone as string;
  if (email !== undefined) input.email = email as string;

  const user = await updateMe(req.user!.userId, input);
  res.status(200).json(user);
}

export async function deleteMeHandler(req: Request, res: Response): Promise<void> {
  await deleteMe(req.user!.userId);
  res.status(200).json({ message: 'Account deleted successfully' });
}
