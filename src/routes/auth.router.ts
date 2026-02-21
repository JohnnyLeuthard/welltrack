import { Router } from 'express';
import { forgotPasswordHandler, loginHandler, logoutHandler, refreshHandler, registerHandler, resetPasswordHandler } from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

export default router;
