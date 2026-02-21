import { Router } from 'express';
import { createMoodLogHandler, listMoodLogsHandler } from '../controllers/mood-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMoodLogsHandler);
router.post('/', authMiddleware, createMoodLogHandler);

export default router;
