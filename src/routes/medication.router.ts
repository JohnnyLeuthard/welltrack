import { Router } from 'express';
import { createMedicationHandler, deleteMedicationHandler, listMedicationsHandler, updateMedicationHandler } from '../controllers/medication.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMedicationsHandler);
router.post('/', authMiddleware, createMedicationHandler);
router.patch('/:id', authMiddleware, updateMedicationHandler);
router.delete('/:id', authMiddleware, deleteMedicationHandler);

export default router;
