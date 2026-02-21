import { Router } from 'express';
import { createHabitHandler, deleteHabitHandler, listHabitsHandler, updateHabitHandler } from '../controllers/habit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listHabitsHandler);
router.post('/', authMiddleware, createHabitHandler);
router.patch('/:id', authMiddleware, updateHabitHandler);
router.delete('/:id', authMiddleware, deleteHabitHandler);

export default router;
