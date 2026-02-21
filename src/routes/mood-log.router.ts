import { Router } from 'express';
import {
  createMoodLogHandler,
  deleteMoodLogHandler,
  listMoodLogsHandler,
  updateMoodLogHandler,
} from '../controllers/mood-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createMoodLogSchema, updateMoodLogSchema } from '../schemas/mood-log.schema';

const router = Router();

router.get('/', authMiddleware, listMoodLogsHandler);
router.post('/', authMiddleware, validateBody(createMoodLogSchema), createMoodLogHandler);
router.patch('/:id', authMiddleware, validateBody(updateMoodLogSchema), updateMoodLogHandler);
router.delete('/:id', authMiddleware, deleteMoodLogHandler);

export default router;
