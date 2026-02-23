import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { importCsvHandler } from '../controllers/import.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.post('/csv', authMiddleware, upload.single('file'), importCsvHandler);

export default router;
