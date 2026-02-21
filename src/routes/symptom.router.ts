import { Router } from 'express';
import { createSymptomHandler, listSymptomsHandler } from '../controllers/symptom.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listSymptomsHandler);
router.post('/', authMiddleware, createSymptomHandler);

export default router;
