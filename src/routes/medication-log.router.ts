import { Router } from 'express';
import {
  createMedicationLogHandler,
  deleteMedicationLogHandler,
  listMedicationLogsHandler,
  updateMedicationLogHandler,
} from '../controllers/medication-log.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMedicationLogsHandler);
router.post('/', authMiddleware, createMedicationLogHandler);
router.patch('/:id', authMiddleware, updateMedicationLogHandler);
router.delete('/:id', authMiddleware, deleteMedicationLogHandler);

export default router;
