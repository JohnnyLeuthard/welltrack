import { Router } from 'express';
import { createSymptomLogHandler, listSymptomLogsHandler, updateSymptomLogHandler } from '../controllers/symptom-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listSymptomLogsHandler);
router.post('/', authMiddleware, createSymptomLogHandler);
router.patch('/:id', authMiddleware, updateSymptomLogHandler);

export default router;
