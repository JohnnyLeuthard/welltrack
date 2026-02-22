import { Router } from 'express';
import { deleteMeHandler, getMeHandler, updateMeHandler } from '../controllers/user.controller';
import { getAuditLogHandler } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { updateMeSchema } from '../schemas/user.schema';

const router = Router();

router.get('/me', authMiddleware, getMeHandler);
router.patch('/me', authMiddleware, validateBody(updateMeSchema), updateMeHandler);
router.delete('/me', authMiddleware, deleteMeHandler);
router.get('/me/audit-log', authMiddleware, getAuditLogHandler);

export default router;
