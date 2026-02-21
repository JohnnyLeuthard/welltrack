import { Router } from 'express';
import { createMedicationHandler, listMedicationsHandler } from '../controllers/medication.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMedicationsHandler);
router.post('/', authMiddleware, createMedicationHandler);

export default router;
