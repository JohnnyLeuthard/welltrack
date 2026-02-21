import { Request, Response } from 'express';
import { getMe } from '../services/user.service';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await getMe(req.user!.userId);
  res.status(200).json(user);
}
