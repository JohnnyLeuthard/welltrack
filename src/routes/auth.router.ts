import { Router } from 'express';
import { registerHandler } from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerHandler);

export default router;
