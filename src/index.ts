import app from './app';
import { startScheduler } from './scheduler';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`WellTrack API running on port ${PORT}`);
  startScheduler();
});
