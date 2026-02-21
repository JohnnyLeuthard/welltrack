import { Router } from 'express';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
} from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema';

const router = Router();

router.post('/register', validateBody(registerSchema), registerHandler);
router.post('/login', validateBody(loginSchema), loginHandler);
router.post('/refresh', validateBody(refreshSchema), refreshHandler);
router.post('/logout', validateBody(logoutSchema), logoutHandler);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPasswordHandler);

export default router;
