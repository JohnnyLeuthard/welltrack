import { Router } from 'express';
import {
  createMedicationHandler,
  deleteMedicationHandler,
  listMedicationsHandler,
  updateMedicationHandler,
} from '../controllers/medication.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createMedicationSchema, updateMedicationSchema } from '../schemas/medication.schema';

const router = Router();

router.get('/', authMiddleware, listMedicationsHandler);
router.post('/', authMiddleware, validateBody(createMedicationSchema), createMedicationHandler);
router.patch('/:id', authMiddleware, validateBody(updateMedicationSchema), updateMedicationHandler);
router.delete('/:id', authMiddleware, deleteMedicationHandler);

export default router;
