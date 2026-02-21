import { Router } from 'express';
import {
  createHabitHandler,
  deleteHabitHandler,
  listHabitsHandler,
  updateHabitHandler,
} from '../controllers/habit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createHabitSchema, updateHabitSchema } from '../schemas/habit.schema';

const router = Router();

router.get('/', authMiddleware, listHabitsHandler);
router.post('/', authMiddleware, validateBody(createHabitSchema), createHabitHandler);
router.patch('/:id', authMiddleware, validateBody(updateHabitSchema), updateHabitHandler);
router.delete('/:id', authMiddleware, deleteHabitHandler);

export default router;
