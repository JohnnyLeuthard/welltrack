import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { exportCsvHandler } from '../controllers/export.controller';

const router = Router();

router.get('/csv', authMiddleware, exportCsvHandler);

export default router;
