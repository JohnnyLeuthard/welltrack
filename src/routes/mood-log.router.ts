import { Router } from 'express';
import { createMoodLogHandler, deleteMoodLogHandler, listMoodLogsHandler, updateMoodLogHandler } from '../controllers/mood-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMoodLogsHandler);
router.post('/', authMiddleware, createMoodLogHandler);
router.patch('/:id', authMiddleware, updateMoodLogHandler);
router.delete('/:id', authMiddleware, deleteMoodLogHandler);

export default router;
