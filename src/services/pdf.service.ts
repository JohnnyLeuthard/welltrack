import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';
import prisma from '../lib/prisma';

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function sectionHeader(doc: InstanceType<typeof PDFDocument>, title: string): void {
  doc
    .moveDown(0.5)
    .fontSize(13)
    .fillColor('#0d9488') // teal-600
    .text(title)
    .moveDown(0.25)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#d1fae5')
    .stroke()
    .moveDown(0.25)
    .fontSize(10)
    .fillColor('#111827');
}

function tableRow(
  doc: InstanceType<typeof PDFDocument>,
  cols: (string | number | boolean | null | undefined)[],
  widths: number[],
  isHeader = false,
): void {
  if (isHeader) {
    doc.font('Helvetica-Bold');
  } else {
    doc.font('Helvetica');
  }
  const startX = doc.page.margins.left;
  let x = startX;
  const y = doc.y;
  cols.forEach((col, i) => {
    doc.text(String(col ?? ''), x, y, { width: widths[i]! - 4, lineBreak: false });
    x += widths[i]!;
  });
  doc.moveDown(0.5);
}

export async function generatePdf(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<Readable> {
  const symFilter = startDate || endDate
    ? { loggedAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
    : {};
  const medFilter = startDate || endDate
    ? { createdAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
    : {};

  const [user, symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true },
    }),
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

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // ── Cover / header ──────────────────────────────────────────────────────────
  doc
    .fontSize(20)
    .fillColor('#0d9488')
    .text('WellTrack Health Report', { align: 'center' })
    .moveDown(0.25)
    .fontSize(10)
    .fillColor('#6b7280')
    .text(`Exported on ${new Date().toLocaleDateString()}`, { align: 'center' });

  if (user) {
    doc.text(`Account: ${user.displayName ?? user.email}`, { align: 'center' });
  }
  if (startDate || endDate) {
    const range = [startDate ? dateKey(startDate) : '', endDate ? dateKey(endDate) : ''].filter(Boolean).join(' → ');
    doc.text(`Date range: ${range}`, { align: 'center' });
  }

  doc.moveDown(1).fillColor('#111827').fontSize(10);

  // ── Symptom Logs ────────────────────────────────────────────────────────────
  sectionHeader(doc, `Symptom Logs (${symptomLogs.length})`);
  if (symptomLogs.length === 0) {
    doc.text('No entries in this period.').moveDown(0.5);
  } else {
    const w = [90, 100, 80, 50, 180];
    tableRow(doc, ['Date', 'Symptom', 'Category', 'Severity', 'Notes'], w, true);
    for (const log of symptomLogs) {
      tableRow(doc, [dateKey(log.loggedAt), log.symptom.name, log.symptom.category, log.severity, log.notes], w);
    }
  }

  // ── Mood Logs ───────────────────────────────────────────────────────────────
  sectionHeader(doc, `Mood Logs (${moodLogs.length})`);
  if (moodLogs.length === 0) {
    doc.text('No entries in this period.').moveDown(0.5);
  } else {
    const w = [90, 55, 60, 55, 240];
    tableRow(doc, ['Date', 'Mood', 'Energy', 'Stress', 'Notes'], w, true);
    for (const log of moodLogs) {
      tableRow(doc, [dateKey(log.loggedAt), log.moodScore, log.energyLevel, log.stressLevel, log.notes], w);
    }
  }

  // ── Medication Logs ─────────────────────────────────────────────────────────
  sectionHeader(doc, `Medication Logs (${medicationLogs.length})`);
  if (medicationLogs.length === 0) {
    doc.text('No entries in this period.').moveDown(0.5);
  } else {
    const w = [90, 130, 80, 50, 150];
    tableRow(doc, ['Date', 'Medication', 'Dosage', 'Taken', 'Notes'], w, true);
    for (const log of medicationLogs) {
      tableRow(doc, [dateKey(log.createdAt), log.medication.name, log.medication.dosage, log.taken ? 'Yes' : 'No', log.notes], w);
    }
  }

  // ── Habit Logs ──────────────────────────────────────────────────────────────
  sectionHeader(doc, `Habit Logs (${habitLogs.length})`);
  if (habitLogs.length === 0) {
    doc.text('No entries in this period.').moveDown(0.5);
  } else {
    const w = [90, 130, 80, 60, 140];
    tableRow(doc, ['Date', 'Habit', 'Type', 'Value', 'Notes'], w, true);
    for (const log of habitLogs) {
      const value =
        log.habit.trackingType === 'boolean' ? (log.valueBoolean ? 'Yes' : 'No')
        : log.habit.trackingType === 'numeric' ? String(log.valueNumeric ?? '')
        : String(log.valueDuration ?? '');
      const valueWithUnit = log.habit.unit ? `${value} ${log.habit.unit}` : value;
      tableRow(doc, [dateKey(log.loggedAt), log.habit.name, log.habit.trackingType, valueWithUnit, log.notes], w);
    }
  }

  doc.end();
  return doc as unknown as Readable;
}
