import { Request, Response } from 'express';
import { deleteMe, getMe, isValidIANATimezone, unsubscribeWeeklyDigest, updateAvatar, updateMe } from '../services/user.service';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await getMe(req.user!.userId);
  res.status(200).json(user);
}

export async function updateMeHandler(req: Request, res: Response): Promise<void> {
  const { displayName, pronouns, phoneNumber, timezone, email, weeklyDigestOptIn } = req.body as Record<string, unknown>;

  if (displayName !== undefined && displayName !== null && typeof displayName !== 'string') {
    res.status(422).json({ error: 'displayName must be a string or null' });
    return;
  }
  if (pronouns !== undefined && pronouns !== null && typeof pronouns !== 'string') {
    res.status(422).json({ error: 'pronouns must be a string or null' });
    return;
  }
  if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== 'string') {
    res.status(422).json({ error: 'phoneNumber must be a string or null' });
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

  const input: {
    displayName?: string | null;
    pronouns?: string | null;
    phoneNumber?: string | null;
    timezone?: string;
    email?: string;
    weeklyDigestOptIn?: boolean;
  } = {};
  if (displayName !== undefined) input.displayName = displayName as string | null;
  if (pronouns !== undefined) input.pronouns = pronouns as string | null;
  if (phoneNumber !== undefined) input.phoneNumber = phoneNumber as string | null;
  if (timezone !== undefined) input.timezone = timezone as string;
  if (email !== undefined) input.email = email as string;
  if (weeklyDigestOptIn !== undefined) input.weeklyDigestOptIn = weeklyDigestOptIn as boolean;

  const user = await updateMe(req.user!.userId, input);
  res.status(200).json(user);
}

export async function deleteMeHandler(req: Request, res: Response): Promise<void> {
  await deleteMe(req.user!.userId);
  res.status(200).json({ message: 'Account deleted successfully' });
}

export async function uploadAvatarHandler(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(422).json({ error: 'No image file provided' });
    return;
  }
  // req.file.path is relative to cwd (e.g. "public/uploads/avatars/uuid.jpg")
  // Store the URL path portion so it is served as /uploads/avatars/uuid.jpg
  const urlPath = '/' + req.file.path.replace(/\\/g, '/');

  // Defensive: ensure path is within the expected avatar directory.
  // Guards against future multer misconfiguration.
  if (!urlPath.startsWith('/uploads/avatars/')) {
    res.status(500).json({ error: 'Avatar storage misconfiguration' });
    return;
  }

  const user = await updateAvatar(req.user!.userId, urlPath);
  res.status(200).json(user);
}

/** Public one-click unsubscribe — no auth required; linked from digest emails. */
export async function unsubscribeHandler(req: Request, res: Response): Promise<void> {
  const token = req.query['token'] as string | undefined;
  if (!token) {
    res.status(400).send('<p>Missing unsubscribe token.</p>');
    return;
  }
  try {
    await unsubscribeWeeklyDigest(token);
    const settingsUrl = `${process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173'}/settings`;
    res.status(200).send(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Unsubscribed — WellTrack</title>` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
      `<body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#374151">` +
      `<h1 style="color:#0d9488">You've been unsubscribed</h1>` +
      `<p>You will no longer receive weekly wellness digest emails from WellTrack.</p>` +
      `<p>You can re-enable them any time in <a href="${settingsUrl}" style="color:#0d9488">Settings</a>.</p>` +
      `</body></html>`,
    );
  } catch {
    res.status(404).send('<p>Invalid or expired unsubscribe link.</p>');
  }
}
