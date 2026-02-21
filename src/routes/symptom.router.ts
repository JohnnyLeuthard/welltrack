import { Router } from 'express';
import { listSymptomsHandler } from '../controllers/symptom.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listSymptomsHandler);

export default router;
