import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getActivitySummary, getStreakSummary, getTrends } from '../controllers/insights.controller';

const router = Router();

router.get('/trends', authMiddleware, getTrends);
router.get('/activity', authMiddleware, getActivitySummary);
router.get('/streak', authMiddleware, getStreakSummary);

export default router;
