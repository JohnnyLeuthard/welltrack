import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { deleteMeHandler, getMeHandler, unsubscribeHandler, updateMeHandler, uploadAvatarHandler } from '../controllers/user.controller';
import { getAuditLogHandler } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { updateMeSchema } from '../schemas/user.schema';

const avatarStorage = multer.diskStorage({
  destination: 'public/uploads/avatars',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
    }
  },
});

const router = Router();

// Public one-click unsubscribe — no auth required; reached via link in digest email
router.get('/unsubscribe', unsubscribeHandler);

router.get('/me', authMiddleware, getMeHandler);
router.patch('/me', authMiddleware, validateBody(updateMeSchema), updateMeHandler);
router.post('/me/avatar', authMiddleware, uploadAvatar.single('avatar'), uploadAvatarHandler);
router.delete('/me', authMiddleware, deleteMeHandler);
router.get('/me/audit-log', authMiddleware, getAuditLogHandler);

export default router;
