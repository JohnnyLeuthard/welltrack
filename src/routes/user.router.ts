import { Router } from 'express';
import { getMeHandler } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getMeHandler);

export default router;
