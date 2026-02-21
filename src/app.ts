import 'dotenv/config';
import express, { Request, Response } from 'express';
import authRouter from './routes/auth.router';
import userRouter from './routes/user.router';
import symptomRouter from './routes/symptom.router';
import symptomLogRouter from './routes/symptom-log.router';
import moodLogRouter from './routes/mood-log.router';
import medicationRouter from './routes/medication.router';
import medicationLogRouter from './routes/medication-log.router';
import habitRouter from './routes/habit.router';
import habitLogRouter from './routes/habit-log.router';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/symptoms', symptomRouter);
app.use('/api/symptom-logs', symptomLogRouter);
app.use('/api/mood-logs', moodLogRouter);
app.use('/api/medications', medicationRouter);
app.use('/api/medication-logs', medicationLogRouter);
app.use('/api/habits', habitRouter);
app.use('/api/habit-logs', habitLogRouter);

// Catch-all 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
app.use(errorHandler);

export default app;
