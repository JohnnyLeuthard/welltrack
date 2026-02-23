import 'dotenv/config';
import cors from 'cors';
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
import insightsRouter from './routes/insights.router';
import exportRouter from './routes/export.router';
import importRouter from './routes/import.router';
import { errorHandler } from './middleware/error.middleware';
import { writeRateLimit } from './middleware/rate-limit.middleware';

const app = express();

app.use(cors({
  origin: process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', writeRateLimit, userRouter);
app.use('/api/symptoms', writeRateLimit, symptomRouter);
app.use('/api/symptom-logs', writeRateLimit, symptomLogRouter);
app.use('/api/mood-logs', writeRateLimit, moodLogRouter);
app.use('/api/medications', writeRateLimit, medicationRouter);
app.use('/api/medication-logs', writeRateLimit, medicationLogRouter);
app.use('/api/habits', writeRateLimit, habitRouter);
app.use('/api/habit-logs', writeRateLimit, habitLogRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/export', exportRouter);
app.use('/api/import', importRouter);

// Catch-all 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
app.use(errorHandler);

export default app;
