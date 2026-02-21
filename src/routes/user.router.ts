import { Router } from 'express';
import { deleteMeHandler, getMeHandler, updateMeHandler } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getMeHandler);
router.patch('/me', authMiddleware, updateMeHandler);
router.delete('/me', authMiddleware, deleteMeHandler);

export default router;
