import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getActivitySummary, getTrends } from '../controllers/insights.controller';

const router = Router();

router.get('/trends', authMiddleware, getTrends);
router.get('/activity', authMiddleware, getActivitySummary);

export default router;
