import { Router } from 'express';
import {
  createHabitLogHandler,
  deleteHabitLogHandler,
  listHabitLogsHandler,
  updateHabitLogHandler,
} from '../controllers/habit-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createHabitLogSchema, updateHabitLogSchema } from '../schemas/habit-log.schema';

const router = Router();

router.get('/', authMiddleware, listHabitLogsHandler);
router.post('/', authMiddleware, validateBody(createHabitLogSchema), createHabitLogHandler);
router.patch('/:id', authMiddleware, validateBody(updateHabitLogSchema), updateHabitLogHandler);
router.delete('/:id', authMiddleware, deleteHabitLogHandler);

export default router;
