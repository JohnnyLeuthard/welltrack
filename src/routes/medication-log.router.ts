import { Router } from 'express';
import {
  createMedicationLogHandler,
  deleteMedicationLogHandler,
  listMedicationLogsHandler,
  updateMedicationLogHandler,
} from '../controllers/medication-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  createMedicationLogSchema,
  updateMedicationLogSchema,
} from '../schemas/medication-log.schema';

const router = Router();

router.get('/', authMiddleware, listMedicationLogsHandler);
router.post('/', authMiddleware, validateBody(createMedicationLogSchema), createMedicationLogHandler);
router.patch('/:id', authMiddleware, validateBody(updateMedicationLogSchema), updateMedicationLogHandler);
router.delete('/:id', authMiddleware, deleteMedicationLogHandler);

export default router;
