import { Request, Response } from 'express';
import { login, register } from '../services/auth.service';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as Record<string, unknown>;

  if (typeof email !== 'string' || !isValidEmail(email)) {
    res.status(422).json({ error: 'A valid email address is required' });
    return;
  }
  if (typeof password !== 'string' || password.length === 0) {
    res.status(422).json({ error: 'Password is required' });
    return;
  }

  try {
    const result = await login({ email: email.toLowerCase().trim(), password });
    res.status(200).json(result);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 401) {
      res.status(401).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const { email, password, displayName } = req.body as Record<string, unknown>;

  if (typeof email !== 'string' || !isValidEmail(email)) {
    res.status(422).json({ error: 'A valid email address is required' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(422).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  if (displayName !== undefined && typeof displayName !== 'string') {
    res.status(422).json({ error: 'displayName must be a string' });
    return;
  }

  try {
    const result = await register({
      email: email.toLowerCase().trim(),
      password,
      displayName: typeof displayName === 'string' ? displayName.trim() : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 409) {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
}
