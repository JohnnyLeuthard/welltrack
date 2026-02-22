import prisma from '../lib/prisma';

function escape(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(...cols: (string | number | boolean | null | undefined)[]): string {
  return cols.map(escape).join(',');
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

export async function generateCsv(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<string> {
  const symFilter = startDate || endDate
    ? { loggedAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
    : {};
  const medFilter = startDate || endDate
    ? { createdAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
    : {};

  const [symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { userId, ...symFilter },
      select: {
        severity: true,
        notes: true,
        loggedAt: true,
        symptom: { select: { name: true, category: true } },
      },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.moodLog.findMany({
      where: { userId, ...symFilter },
      select: { moodScore: true, energyLevel: true, stressLevel: true, notes: true, loggedAt: true },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.medicationLog.findMany({
      where: { userId, ...medFilter },
      select: {
        taken: true,
        notes: true,
        createdAt: true,
        medication: { select: { name: true, dosage: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.habitLog.findMany({
      where: { userId, ...symFilter },
      select: {
        valueBoolean: true,
        valueNumeric: true,
        valueDuration: true,
        notes: true,
        loggedAt: true,
        habit: { select: { name: true, trackingType: true, unit: true } },
      },
      orderBy: { loggedAt: 'asc' },
    }),
  ]);

  const lines: string[] = [];

  lines.push('Symptom Logs');
  lines.push(row('date', 'symptom_name', 'category', 'severity', 'notes'));
  for (const log of symptomLogs) {
    lines.push(row(dateKey(log.loggedAt), log.symptom.name, log.symptom.category, log.severity, log.notes));
  }

  lines.push('');
  lines.push('Mood Logs');
  lines.push(row('date', 'mood_score', 'energy_level', 'stress_level', 'notes'));
  for (const log of moodLogs) {
    lines.push(row(dateKey(log.loggedAt), log.moodScore, log.energyLevel, log.stressLevel, log.notes));
  }

  lines.push('');
  lines.push('Medication Logs');
  lines.push(row('date', 'medication_name', 'dosage', 'taken', 'notes'));
  for (const log of medicationLogs) {
    lines.push(row(dateKey(log.createdAt), log.medication.name, log.medication.dosage, log.taken ? 'yes' : 'no', log.notes));
  }

  lines.push('');
  lines.push('Habit Logs');
  lines.push(row('date', 'habit_name', 'tracking_type', 'value', 'unit', 'notes'));
  for (const log of habitLogs) {
    const value =
      log.habit.trackingType === 'boolean' ? (log.valueBoolean ? 'yes' : 'no')
      : log.habit.trackingType === 'numeric' ? log.valueNumeric
      : log.valueDuration;
    lines.push(row(dateKey(log.loggedAt), log.habit.name, log.habit.trackingType, value, log.habit.unit, log.notes));
  }

  return lines.join('\n');
}
