import { Router } from 'express';
import {
  createHabitLogHandler,
  deleteHabitLogHandler,
  listHabitLogsHandler,
  updateHabitLogHandler,
} from '../controllers/habit-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listHabitLogsHandler);
router.post('/', authMiddleware, createHabitLogHandler);
router.patch('/:id', authMiddleware, updateHabitLogHandler);
router.delete('/:id', authMiddleware, deleteHabitLogHandler);

export default router;
