import { Router } from 'express';
import { createSymptomHandler, listSymptomsHandler, updateSymptomHandler } from '../controllers/symptom.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listSymptomsHandler);
router.post('/', authMiddleware, createSymptomHandler);
router.patch('/:id', authMiddleware, updateSymptomHandler);

export default router;
