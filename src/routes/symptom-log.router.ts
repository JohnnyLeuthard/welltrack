import { Router } from 'express';
import { listSymptomLogsHandler } from '../controllers/symptom-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listSymptomLogsHandler);

export default router;
