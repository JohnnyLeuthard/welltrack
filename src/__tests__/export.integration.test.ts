import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const EXPORT = '/api/export/csv';

const testUser = { email: 'user@export.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

function recentDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return d;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@export.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  // One entry of each log type, 2 days ago
  const symptom = await prisma.symptom.create({
    data: { userId, name: 'Export Test Symptom', isActive: true },
  });
  await prisma.symptomLog.create({
    data: { userId, symptomId: symptom.id, severity: 5, loggedAt: recentDate(2) },
  });

  await prisma.moodLog.create({
    data: { userId, moodScore: 3, loggedAt: recentDate(2) },
  });

  const medication = await prisma.medication.create({
    data: { userId, name: 'Export Test Med', isActive: true },
  });
  await prisma.medicationLog.create({
    data: { userId, medicationId: medication.id, taken: true },
  });

  const habit = await prisma.habit.create({
    data: { userId, name: 'Export Test Habit', trackingType: 'boolean', isActive: true },
  });
  await prisma.habitLog.create({
    data: { userId, habitId: habit.id, valueBoolean: true, loggedAt: recentDate(2) },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@export.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/export/csv', () => {
  it('returns 200 with Content-Type text/csv', async () => {
    const res = await request(app)
      .get(EXPORT)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('sets a Content-Disposition attachment header', async () => {
    const res = await request(app)
      .get(EXPORT)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.headers['content-disposition']).toMatch(/attachment; filename=/);
  });

  it('body contains all four section headers', async () => {
    const res = await request(app)
      .get(EXPORT)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.text).toContain('Symptom Logs');
    expect(res.text).toContain('Mood Logs');
    expect(res.text).toContain('Medication Logs');
    expect(res.text).toContain('Habit Logs');
  });

  it('includes seeded data rows in the export', async () => {
    const res = await request(app)
      .get(EXPORT)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.text).toContain('Export Test Symptom');
    expect(res.text).toContain('Export Test Med');
    expect(res.text).toContain('Export Test Habit');
  });

  it('filters by date range — includes data when range covers seed data', async () => {
    const start = recentDate(7).toISOString();
    const end = new Date().toISOString();

    const res = await request(app)
      .get(`${EXPORT}?startDate=${start}&endDate=${end}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Export Test Symptom');
  });

  it('filters by date range — no data rows when range excludes all seed data', async () => {
    const res = await request(app)
      .get(`${EXPORT}?startDate=2020-01-01T00:00:00.000Z&endDate=2020-01-31T23:59:59.000Z`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    // Section headers still present
    expect(res.text).toContain('Symptom Logs');
    // But no seeded data rows
    expect(res.text).not.toContain('Export Test Symptom');
  });

  it('returns 422 for an invalid startDate', async () => {
    const res = await request(app)
      .get(`${EXPORT}?startDate=not-a-date`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Invalid startDate' });
  });

  it('returns 422 for an invalid endDate', async () => {
    const res = await request(app)
      .get(`${EXPORT}?endDate=not-a-date`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'Invalid endDate' });
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(EXPORT);
    expect(res.status).toBe(401);
  });
});
