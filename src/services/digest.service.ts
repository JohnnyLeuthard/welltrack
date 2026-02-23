import prisma from '../lib/prisma';
import { type DigestEmailData, sendWeeklyDigestEmail } from './email.service';
import { getStreak } from './insights.service';

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function average(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Collect last-7-days stats for a single user and build the digest payload. */
async function buildDigestData(userId: string): Promise<DigestEmailData> {
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [symptomLogs, moodLogs, medicationLogs, habitLogs, streakInfo] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { userId, loggedAt: { gte: weekStart, lte: weekEnd } },
      select: { loggedAt: true },
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: weekStart, lte: weekEnd } },
      select: { moodScore: true, energyLevel: true, stressLevel: true, loggedAt: true },
    }),
    prisma.medicationLog.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      select: { createdAt: true },
    }),
    prisma.habitLog.findMany({
      where: { userId, loggedAt: { gte: weekStart, lte: weekEnd } },
      select: { loggedAt: true },
    }),
    getStreak(userId),
  ]);

  // Unique days with at least one log entry
  const loggedDates = new Set<string>([
    ...symptomLogs.map((l) => toDateStr(l.loggedAt)),
    ...moodLogs.map((l) => toDateStr(l.loggedAt)),
    ...medicationLogs.map((l) => toDateStr(l.createdAt)),
    ...habitLogs.map((l) => toDateStr(l.loggedAt)),
  ]);

  const moodScores = moodLogs.map((l) => l.moodScore);
  const energyLevels = moodLogs.map((l) => l.energyLevel).filter((v): v is number => v !== null);
  const stressLevels = moodLogs.map((l) => l.stressLevel).filter((v): v is number => v !== null);

  return {
    weekStart: toDateStr(weekStart),
    weekEnd: toDateStr(weekEnd),
    daysLogged: loggedDates.size,
    totalEntries: symptomLogs.length + moodLogs.length + medicationLogs.length + habitLogs.length,
    symptomLogs: symptomLogs.length,
    moodLogs: moodLogs.length,
    medicationLogs: medicationLogs.length,
    habitLogs: habitLogs.length,
    avgMood: average(moodScores),
    avgEnergy: average(energyLevels),
    avgStress: average(stressLevels),
    currentStreak: streakInfo.currentStreak,
  };
}

/** Send the weekly digest to all opted-in users. Called by the scheduler. */
export async function runWeeklyDigest(): Promise<void> {
  const apiBase = process.env['API_BASE_URL'] ?? `http://localhost:${process.env['PORT'] ?? 3000}`;

  const users = await prisma.user.findMany({
    where: { weeklyDigestOptIn: true, weeklyDigestToken: { not: null } },
    select: { id: true, email: true, weeklyDigestToken: true },
  });

  console.log(`[DIGEST] Sending weekly digest to ${users.length} user(s)`);

  for (const user of users) {
    try {
      const data = await buildDigestData(user.id);
      const unsubscribeUrl = `${apiBase}/api/users/unsubscribe?token=${user.weeklyDigestToken!}`;
      sendWeeklyDigestEmail(user.email, data, unsubscribeUrl);
    } catch (err) {
      console.error(`[DIGEST] Failed to send digest to ${user.email}:`, err);
    }
  }
}
