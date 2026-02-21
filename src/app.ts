import 'dotenv/config';
import express from 'express';
import authRouter from './routes/auth.router';
import userRouter from './routes/user.router';
import symptomRouter from './routes/symptom.router';
import symptomLogRouter from './routes/symptom-log.router';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/symptoms', symptomRouter);
app.use('/api/symptom-logs', symptomLogRouter);

export default app;
