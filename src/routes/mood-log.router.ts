import { Router } from 'express';
import { listMoodLogsHandler } from '../controllers/mood-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMoodLogsHandler);

export default router;
