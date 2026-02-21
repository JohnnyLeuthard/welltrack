import { Router } from 'express';
import { listMedicationsHandler } from '../controllers/medication.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listMedicationsHandler);

export default router;
