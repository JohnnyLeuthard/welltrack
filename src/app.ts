import 'dotenv/config';
import express from 'express';
import authRouter from './routes/auth.router';
import userRouter from './routes/user.router';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

export default app;
