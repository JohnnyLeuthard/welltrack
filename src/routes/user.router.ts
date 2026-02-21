import { Router } from 'express';
import { deleteMeHandler, getMeHandler, updateMeHandler } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { updateMeSchema } from '../schemas/user.schema';

const router = Router();

router.get('/me', authMiddleware, getMeHandler);
router.patch('/me', authMiddleware, validateBody(updateMeSchema), updateMeHandler);
router.delete('/me', authMiddleware, deleteMeHandler);

export default router;
