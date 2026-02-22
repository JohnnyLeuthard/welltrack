import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { exportCsvHandler, exportPdfHandler } from '../controllers/export.controller';

const router = Router();

router.get('/csv', authMiddleware, exportCsvHandler);
router.get('/pdf', authMiddleware, exportPdfHandler);

export default router;
