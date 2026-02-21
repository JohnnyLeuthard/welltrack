import { Router } from 'express';
import {
  createSymptomHandler,
  deleteSymptomHandler,
  listSymptomsHandler,
  updateSymptomHandler,
} from '../controllers/symptom.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createSymptomSchema, updateSymptomSchema } from '../schemas/symptom.schema';

const router = Router();

router.get('/', authMiddleware, listSymptomsHandler);
router.post('/', authMiddleware, validateBody(createSymptomSchema), createSymptomHandler);
router.patch('/:id', authMiddleware, validateBody(updateSymptomSchema), updateSymptomHandler);
router.delete('/:id', authMiddleware, deleteSymptomHandler);

export default router;
