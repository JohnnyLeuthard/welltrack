import cron from 'node-cron';
import { runWeeklyDigest } from './services/digest.service';

/**
 * Start all background scheduled jobs.
 * Called once from src/index.ts after the server starts.
 *
 * Weekly digest: every Monday at 08:00 UTC.
 * Cron expression: 0 8 * * 1  (minute=0, hour=8, any day-of-month, any month, Monday)
 */
export function startScheduler(): void {
  cron.schedule(
    '0 8 * * 1',
    () => {
      console.log('[SCHEDULER] Running weekly wellness digest job');
      runWeeklyDigest().catch((err) => {
        console.error('[SCHEDULER] Weekly digest job failed:', err);
      });
    },
    { timezone: 'UTC' },
  );

  console.log('[SCHEDULER] Weekly digest scheduled — Mondays 08:00 UTC');
}
