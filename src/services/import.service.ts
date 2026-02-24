import prisma from '../lib/prisma';

export interface ImportResult {
  imported: {
    symptomLogs: number;
    moodLogs: number;
    medicationLogs: number;
    habitLogs: number;
  };
  skipped: {
    symptomLogs: number;
    moodLogs: number;
    medicationLogs: number;
    habitLogs: number;
  };
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

/** Strip leading formula-injection characters from user-controlled string fields. */
function sanitizeCsvField(value: string): string {
  return value.replace(/^[=+\-@\t\r]+/, '');
}

function parseDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(dateStr + 'T00:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}

interface ParsedSection {
  rows: Record<string, string>[];
  endIdx: number;
}

function parseSection(lines: string[], headerIdx: number): ParsedSection {
  if (headerIdx >= lines.length) return { rows: [], endIdx: headerIdx };

  const headers = parseCsvLine(lines[headerIdx]!);
  const rows: Record<string, string>[] = [];
  let i = headerIdx + 1;

  while (i < lines.length && lines[i]!.trim() !== '') {
    const values = parseCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
    i++;
  }

  return { rows, endIdx: i };
}

export async function importCsv(userId: string, csvContent: string): Promise<ImportResult> {
  const result: ImportResult = {
    imported: { symptomLogs: 0, moodLogs: 0, medicationLogs: 0, habitLogs: 0 },
    skipped: { symptomLogs: 0, moodLogs: 0, medicationLogs: 0, habitLogs: 0 },
    errors: [],
  };

  const lines = csvContent.split(/\r?\n/).map((l) => l.trimEnd());
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();

    if (line === 'Symptom Logs') {
      const { rows, endIdx } = parseSection(lines, i + 1);
      i = endIdx;
      await processSymptomLogs(userId, rows, result);
    } else if (line === 'Mood Logs') {
      const { rows, endIdx } = parseSection(lines, i + 1);
      i = endIdx;
      await processMoodLogs(userId, rows, result);
    } else if (line === 'Medication Logs') {
      const { rows, endIdx } = parseSection(lines, i + 1);
      i = endIdx;
      await processMedicationLogs(userId, rows, result);
    } else if (line === 'Habit Logs') {
      const { rows, endIdx } = parseSection(lines, i + 1);
      i = endIdx;
      await processHabitLogs(userId, rows, result);
    } else {
      i++;
    }
  }

  return result;
}

async function processSymptomLogs(
  userId: string,
  rows: Record<string, string>[],
  result: ImportResult,
): Promise<void> {
  if (rows.length === 0) return;

  const symptoms = await prisma.symptom.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    select: { id: true, name: true },
  });
  const symptomMap = new Map(symptoms.map((s) => [s.name.toLowerCase(), s.id]));

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]!;
    const rowNum = rowIdx + 1;

    const date = parseDate(row['date'] ?? '');
    if (!date) {
      result.errors.push(`Symptom Logs row ${rowNum}: invalid date "${row['date']}"`);
      result.skipped.symptomLogs++;
      continue;
    }

    const symptomName = (row['symptom_name'] ?? '').trim();
    const symptomId = symptomMap.get(symptomName.toLowerCase());
    if (!symptomId) {
      result.errors.push(`Symptom Logs row ${rowNum}: symptom "${symptomName}" not found`);
      result.skipped.symptomLogs++;
      continue;
    }

    const severity = parseInt(row['severity'] ?? '', 10);
    if (isNaN(severity) || severity < 1 || severity > 10) {
      result.errors.push(`Symptom Logs row ${rowNum}: invalid severity "${row['severity']}"`);
      result.skipped.symptomLogs++;
      continue;
    }

    const notes = sanitizeCsvField((row['notes'] ?? '').trim()) || null;

    await prisma.symptomLog.create({
      data: { userId, symptomId, severity, notes, loggedAt: date },
    });
    result.imported.symptomLogs++;
  }
}

async function processMoodLogs(
  userId: string,
  rows: Record<string, string>[],
  result: ImportResult,
): Promise<void> {
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]!;
    const rowNum = rowIdx + 1;

    const date = parseDate(row['date'] ?? '');
    if (!date) {
      result.errors.push(`Mood Logs row ${rowNum}: invalid date "${row['date']}"`);
      result.skipped.moodLogs++;
      continue;
    }

    const moodScore = parseInt(row['mood_score'] ?? '', 10);
    if (isNaN(moodScore) || moodScore < 1 || moodScore > 5) {
      result.errors.push(`Mood Logs row ${rowNum}: invalid mood_score "${row['mood_score']}"`);
      result.skipped.moodLogs++;
      continue;
    }

    const energyRaw = (row['energy_level'] ?? '').trim();
    const energyLevel = energyRaw ? parseInt(energyRaw, 10) : null;
    if (energyLevel !== null && (isNaN(energyLevel) || energyLevel < 1 || energyLevel > 5)) {
      result.errors.push(`Mood Logs row ${rowNum}: invalid energy_level "${energyRaw}"`);
      result.skipped.moodLogs++;
      continue;
    }

    const stressRaw = (row['stress_level'] ?? '').trim();
    const stressLevel = stressRaw ? parseInt(stressRaw, 10) : null;
    if (stressLevel !== null && (isNaN(stressLevel) || stressLevel < 1 || stressLevel > 5)) {
      result.errors.push(`Mood Logs row ${rowNum}: invalid stress_level "${stressRaw}"`);
      result.skipped.moodLogs++;
      continue;
    }

    const notes = sanitizeCsvField((row['notes'] ?? '').trim()) || null;

    await prisma.moodLog.create({
      data: { userId, moodScore, energyLevel, stressLevel, notes, loggedAt: date },
    });
    result.imported.moodLogs++;
  }
}

async function processMedicationLogs(
  userId: string,
  rows: Record<string, string>[],
  result: ImportResult,
): Promise<void> {
  if (rows.length === 0) return;

  const medications = await prisma.medication.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const medMap = new Map(medications.map((m) => [m.name.toLowerCase(), m.id]));

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]!;
    const rowNum = rowIdx + 1;

    const date = parseDate(row['date'] ?? '');
    if (!date) {
      result.errors.push(`Medication Logs row ${rowNum}: invalid date "${row['date']}"`);
      result.skipped.medicationLogs++;
      continue;
    }

    const medName = (row['medication_name'] ?? '').trim();
    const medicationId = medMap.get(medName.toLowerCase());
    if (!medicationId) {
      result.errors.push(`Medication Logs row ${rowNum}: medication "${medName}" not found`);
      result.skipped.medicationLogs++;
      continue;
    }

    const takenRaw = (row['taken'] ?? '').trim().toLowerCase();
    if (takenRaw !== 'yes' && takenRaw !== 'no') {
      result.errors.push(
        `Medication Logs row ${rowNum}: invalid taken "${row['taken']}"; expected "yes" or "no"`,
      );
      result.skipped.medicationLogs++;
      continue;
    }
    const taken = takenRaw === 'yes';

    const notes = sanitizeCsvField((row['notes'] ?? '').trim()) || null;

    await prisma.medicationLog.create({
      data: { userId, medicationId, taken, notes, takenAt: taken ? date : null },
    });
    result.imported.medicationLogs++;
  }
}

async function processHabitLogs(
  userId: string,
  rows: Record<string, string>[],
  result: ImportResult,
): Promise<void> {
  if (rows.length === 0) return;

  const habits = await prisma.habit.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    select: { id: true, name: true, trackingType: true },
  });
  const habitMap = new Map(habits.map((h) => [h.name.toLowerCase(), h]));

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]!;
    const rowNum = rowIdx + 1;

    const date = parseDate(row['date'] ?? '');
    if (!date) {
      result.errors.push(`Habit Logs row ${rowNum}: invalid date "${row['date']}"`);
      result.skipped.habitLogs++;
      continue;
    }

    const habitName = (row['habit_name'] ?? '').trim();
    const habit = habitMap.get(habitName.toLowerCase());
    if (!habit) {
      result.errors.push(`Habit Logs row ${rowNum}: habit "${habitName}" not found`);
      result.skipped.habitLogs++;
      continue;
    }

    const valueRaw = (row['value'] ?? '').trim();
    const notes = sanitizeCsvField((row['notes'] ?? '').trim()) || null;

    let valueBoolean: boolean | null = null;
    let valueNumeric: number | null = null;
    let valueDuration: number | null = null;

    if (habit.trackingType === 'boolean') {
      const lower = valueRaw.toLowerCase();
      if (lower !== 'yes' && lower !== 'no') {
        result.errors.push(`Habit Logs row ${rowNum}: invalid boolean value "${valueRaw}"`);
        result.skipped.habitLogs++;
        continue;
      }
      valueBoolean = lower === 'yes';
    } else if (habit.trackingType === 'numeric') {
      const num = parseFloat(valueRaw);
      if (isNaN(num)) {
        result.errors.push(`Habit Logs row ${rowNum}: invalid numeric value "${valueRaw}"`);
        result.skipped.habitLogs++;
        continue;
      }
      valueNumeric = num;
    } else if (habit.trackingType === 'duration') {
      const num = parseInt(valueRaw, 10);
      if (isNaN(num)) {
        result.errors.push(`Habit Logs row ${rowNum}: invalid duration value "${valueRaw}"`);
        result.skipped.habitLogs++;
        continue;
      }
      valueDuration = num;
    }

    await prisma.habitLog.create({
      data: { userId, habitId: habit.id, valueBoolean, valueNumeric, valueDuration, notes, loggedAt: date },
    });
    result.imported.habitLogs++;
  }
}
