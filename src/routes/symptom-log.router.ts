import { Router } from 'express';
import {
  createSymptomLogHandler,
  deleteSymptomLogHandler,
  listSymptomLogsHandler,
  updateSymptomLogHandler,
} from '../controllers/symptom-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createSymptomLogSchema, updateSymptomLogSchema } from '../schemas/symptom-log.schema';

const router = Router();

router.get('/', authMiddleware, listSymptomLogsHandler);
router.post('/', authMiddleware, validateBody(createSymptomLogSchema), createSymptomLogHandler);
router.patch('/:id', authMiddleware, validateBody(updateSymptomLogSchema), updateSymptomLogHandler);
router.delete('/:id', authMiddleware, deleteSymptomLogHandler);

export default router;
