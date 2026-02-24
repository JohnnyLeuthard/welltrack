import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { importCsvHandler } from '../controllers/import.controller';

const router = Router();

// text/plain and application/vnd.ms-excel are included because Windows
// browsers and curl commonly send these MIME types for .csv files.
const ALLOWED_CSV_MIME = new Set(['text/csv', 'text/plain', 'application/vnd.ms-excel']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_CSV_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only CSV files are accepted'));
  },
});

router.post(
  '/csv',
  authMiddleware,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError || err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  importCsvHandler,
);

export default router;
