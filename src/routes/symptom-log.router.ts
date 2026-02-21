import { Router } from 'express';
import { createSymptomLogHandler, listSymptomLogsHandler } from '../controllers/symptom-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listSymptomLogsHandler);
router.post('/', authMiddleware, createSymptomLogHandler);

export default router;
