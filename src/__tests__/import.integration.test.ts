import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const IMPORT = '/api/import/csv';

const testUser = { email: 'user@import.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

function makeCsv(sections: {
  symptomLogs?: string[];
  moodLogs?: string[];
  medicationLogs?: string[];
  habitLogs?: string[];
}): Buffer {
  const lines: string[] = [];
  lines.push('Symptom Logs');
  lines.push('date,symptom_name,category,severity,notes');
  for (const row of sections.symptomLogs ?? []) lines.push(row);
  lines.push('');
  lines.push('Mood Logs');
  lines.push('date,mood_score,energy_level,stress_level,notes');
  for (const row of sections.moodLogs ?? []) lines.push(row);
  lines.push('');
  lines.push('Medication Logs');
  lines.push('date,medication_name,dosage,taken,notes');
  for (const row of sections.medicationLogs ?? []) lines.push(row);
  lines.push('');
  lines.push('Habit Logs');
  lines.push('date,habit_name,tracking_type,value,unit,notes');
  for (const row of sections.habitLogs ?? []) lines.push(row);
  return Buffer.from(lines.join('\n'), 'utf-8');
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@import.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  await prisma.symptom.create({ data: { userId, name: 'Import Test Symptom', isActive: true } });
  await prisma.medication.create({ data: { userId, name: 'Import Test Med', isActive: true } });
  await prisma.habit.create({
    data: { userId, name: 'Import Bool Habit', trackingType: 'boolean', isActive: true },
  });
  await prisma.habit.create({
    data: { userId, name: 'Import Numeric Habit', trackingType: 'numeric', isActive: true },
  });
  await prisma.habit.create({
    data: { userId, name: 'Import Duration Habit', trackingType: 'duration', isActive: true },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@import.welltrack' } } });
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.symptomLog.deleteMany({ where: { userId } });
  await prisma.moodLog.deleteMany({ where: { userId } });
  await prisma.medicationLog.deleteMany({ where: { userId } });
  await prisma.habitLog.deleteMany({ where: { userId } });
});

describe('POST /api/import/csv', () => {
  it('returns 401 without a token', async () => {
    const csv = makeCsv({});
    const res = await request(app)
      .post(IMPORT)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });
    expect(res.status).toBe(401);
  });

  it('returns 400 with no file', async () => {
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 200 with all-zero counts for an empty CSV', async () => {
    const csv = makeCsv({});
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported).toEqual({ symptomLogs: 0, moodLogs: 0, medicationLogs: 0, habitLogs: 0 });
    expect(res.body.skipped).toEqual({ symptomLogs: 0, moodLogs: 0, medicationLogs: 0, habitLogs: 0 });
    expect(res.body.errors).toEqual([]);
  });

  it('imports mood logs and persists correct values', async () => {
    const csv = makeCsv({ moodLogs: ['2024-01-15,3,4,2,Feeling okay'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.moodLogs).toBe(1);
    expect(res.body.skipped.moodLogs).toBe(0);

    const logs = await prisma.moodLog.findMany({ where: { userId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.moodScore).toBe(3);
    expect(logs[0]!.energyLevel).toBe(4);
    expect(logs[0]!.stressLevel).toBe(2);
    expect(logs[0]!.notes).toBe('Feeling okay');
  });

  it('imports mood logs with missing optional fields', async () => {
    const csv = makeCsv({ moodLogs: ['2024-01-15,5,,,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.moodLogs).toBe(1);

    const logs = await prisma.moodLog.findMany({ where: { userId } });
    expect(logs[0]!.energyLevel).toBeNull();
    expect(logs[0]!.stressLevel).toBeNull();
  });

  it('imports symptom logs for user-created symptoms', async () => {
    const csv = makeCsv({ symptomLogs: ['2024-01-15,Import Test Symptom,pain,7,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.symptomLogs).toBe(1);

    const logs = await prisma.symptomLog.findMany({ where: { userId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.severity).toBe(7);
  });

  it('skips symptom logs for unknown symptoms and records an error', async () => {
    const csv = makeCsv({ symptomLogs: ['2024-01-15,Totally Unknown Symptom,pain,5,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.symptomLogs).toBe(0);
    expect(res.body.skipped.symptomLogs).toBe(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0]).toContain('not found');
  });

  it('skips symptom logs with invalid severity and records an error', async () => {
    const csv = makeCsv({ symptomLogs: ['2024-01-15,Import Test Symptom,pain,11,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.symptomLogs).toBe(0);
    expect(res.body.skipped.symptomLogs).toBe(1);
    expect(res.body.errors[0]).toContain('severity');
  });

  it('imports medication logs for existing medications', async () => {
    const csv = makeCsv({ medicationLogs: ['2024-01-15,Import Test Med,,yes,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.medicationLogs).toBe(1);

    const logs = await prisma.medicationLog.findMany({ where: { userId } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.taken).toBe(true);
  });

  it('skips medication logs for unknown medications', async () => {
    const csv = makeCsv({ medicationLogs: ['2024-01-15,No Such Med,,yes,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.medicationLogs).toBe(0);
    expect(res.body.skipped.medicationLogs).toBe(1);
  });

  it('imports boolean habit logs', async () => {
    const csv = makeCsv({ habitLogs: ['2024-01-15,Import Bool Habit,boolean,yes,,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.habitLogs).toBe(1);

    const logs = await prisma.habitLog.findMany({ where: { userId } });
    expect(logs[0]!.valueBoolean).toBe(true);
  });

  it('imports numeric habit logs', async () => {
    const csv = makeCsv({ habitLogs: ['2024-01-15,Import Numeric Habit,numeric,8,,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.habitLogs).toBe(1);

    const logs = await prisma.habitLog.findMany({ where: { userId } });
    expect(logs[0]!.valueNumeric).toBe(8);
  });

  it('imports duration habit logs', async () => {
    const csv = makeCsv({ habitLogs: ['2024-01-15,Import Duration Habit,duration,480,,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.habitLogs).toBe(1);

    const logs = await prisma.habitLog.findMany({ where: { userId } });
    expect(logs[0]!.valueDuration).toBe(480);
  });

  it('imports all four log types in a single CSV and returns correct counts', async () => {
    const csv = makeCsv({
      symptomLogs: ['2024-01-15,Import Test Symptom,pain,5,'],
      moodLogs: ['2024-01-15,4,,2,'],
      medicationLogs: ['2024-01-15,Import Test Med,,no,'],
      habitLogs: ['2024-01-15,Import Bool Habit,boolean,no,,'],
    });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.symptomLogs).toBe(1);
    expect(res.body.imported.moodLogs).toBe(1);
    expect(res.body.imported.medicationLogs).toBe(1);
    expect(res.body.imported.habitLogs).toBe(1);
    expect(res.body.errors).toHaveLength(0);
  });

  it('partial import: valid rows succeed and invalid rows are skipped', async () => {
    const csv = makeCsv({
      moodLogs: [
        '2024-01-15,3,,,',
        'not-a-date,3,,,', // invalid date
        '2024-01-16,6,,,', // invalid mood_score (6 > 5)
      ],
    });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.moodLogs).toBe(1);
    expect(res.body.skipped.moodLogs).toBe(2);
    expect(res.body.errors).toHaveLength(2);
  });

  it('case-insensitive symptom name matching', async () => {
    const csv = makeCsv({ symptomLogs: ['2024-01-15,IMPORT TEST SYMPTOM,pain,3,'] });
    const res = await request(app)
      .post(IMPORT)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', csv, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.imported.symptomLogs).toBe(1);
  });
});
