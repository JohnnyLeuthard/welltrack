import prisma from '../lib/prisma';

export interface TrendPoint {
  date: string;
  avg: number;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

type MoodMetric = 'mood' | 'energy' | 'stress';

function startOfRange(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function average(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export async function getMoodTrend(
  userId: string,
  metric: MoodMetric,
  days: number,
): Promise<TrendPoint[]> {
  const startDate = startOfRange(days);

  const logs = await prisma.moodLog.findMany({
    where: { userId, loggedAt: { gte: startDate } },
    select: { moodScore: true, energyLevel: true, stressLevel: true, loggedAt: true },
    orderBy: { loggedAt: 'asc' },
  });

  const map = new Map<string, number[]>();
  for (const log of logs) {
    const val =
      metric === 'mood' ? log.moodScore
      : metric === 'energy' ? log.energyLevel
      : log.stressLevel;
    if (val === null) continue;
    const date = toDateKey(log.loggedAt);
    const arr = map.get(date) ?? [];
    arr.push(val);
    map.set(date, arr);
  }

  return [...map.entries()]
    .map(([date, vals]) => ({ date, avg: average(vals) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSymptomTrend(
  userId: string,
  symptomId: string,
  days: number,
): Promise<TrendPoint[]> {
  const startDate = startOfRange(days);

  // Verify symptom is accessible (system or owned by user)
  const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });
  if (!symptom || (symptom.userId !== null && symptom.userId !== userId)) {
    const err = new Error('Symptom not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const logs = await prisma.symptomLog.findMany({
    where: { userId, symptomId, loggedAt: { gte: startDate } },
    select: { severity: true, loggedAt: true },
    orderBy: { loggedAt: 'asc' },
  });

  const map = new Map<string, number[]>();
  for (const log of logs) {
    const date = toDateKey(log.loggedAt);
    const arr = map.get(date) ?? [];
    arr.push(log.severity);
    map.set(date, arr);
  }

  return [...map.entries()]
    .map(([date, vals]) => ({ date, avg: average(vals) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface StreakInfo {
  currentStreak: number;
}

export async function getStreak(userId: string): Promise<StreakInfo> {
  // Look back up to 400 days to cover any reasonable streak length
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 400);
  startDate.setHours(0, 0, 0, 0);

  const [symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
      select: { loggedAt: true },
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
      select: { loggedAt: true },
    }),
    prisma.medicationLog.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
    prisma.habitLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
      select: { loggedAt: true },
    }),
  ]);

  const loggedDates = new Set<string>();
  for (const log of symptomLogs) loggedDates.add(toDateKey(log.loggedAt));
  for (const log of moodLogs) loggedDates.add(toDateKey(log.loggedAt));
  for (const log of medicationLogs) loggedDates.add(toDateKey(log.createdAt));
  for (const log of habitLogs) loggedDates.add(toDateKey(log.loggedAt));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateKey(today);

  // If today has no logs yet, start counting from yesterday (streak still alive)
  const startDay = new Date(today);
  if (!loggedDates.has(todayStr)) {
    startDay.setDate(today.getDate() - 1);
  }

  let currentStreak = 0;
  const cursor = new Date(startDay);
  while (loggedDates.has(toDateKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { currentStreak };
}

export async function getActivity(userId: string, days: number): Promise<ActivityPoint[]> {
  const startDate = startOfRange(days);

  const [symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
      select: { loggedAt: true },
    }),
    prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
      select: { loggedAt: true },
    }),
    prisma.medicationLog.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
    prisma.habitLog.findMany({
      where: { userId, loggedAt: { gte: startDate } },
      select: { loggedAt: true },
    }),
  ]);

  const countMap = new Map<string, number>();

  for (const log of symptomLogs) {
    const date = toDateKey(log.loggedAt);
    countMap.set(date, (countMap.get(date) ?? 0) + 1);
  }
  for (const log of moodLogs) {
    const date = toDateKey(log.loggedAt);
    countMap.set(date, (countMap.get(date) ?? 0) + 1);
  }
  for (const log of medicationLogs) {
    const date = toDateKey(log.createdAt);
    countMap.set(date, (countMap.get(date) ?? 0) + 1);
  }
  for (const log of habitLogs) {
    const date = toDateKey(log.loggedAt);
    countMap.set(date, (countMap.get(date) ?? 0) + 1);
  }

  return [...countMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
