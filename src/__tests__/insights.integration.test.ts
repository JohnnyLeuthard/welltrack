import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const TRENDS = '/api/insights/trends';
const ACTIVITY = '/api/insights/activity';

const testUser = { email: 'user@insights.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let symptomId: string;

// Seed logs close to today so they fall within any days window (7/30/90)
function recentDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return d;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@insights.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  // 3 mood logs: 2 days ago (score 2) and yesterday (score 4 twice — avg 4)
  await prisma.moodLog.createMany({
    data: [
      { userId, moodScore: 2, energyLevel: 1, stressLevel: 5, loggedAt: recentDate(2) },
      { userId, moodScore: 4, energyLevel: 3, stressLevel: 3, loggedAt: recentDate(1) },
      { userId, moodScore: 4, energyLevel: 5, stressLevel: 1, loggedAt: recentDate(1) },
    ],
  });

  // Custom symptom + 2 severity logs
  const symptom = await prisma.symptom.create({
    data: { userId, name: 'Insights Test Headache', category: 'pain', isActive: true },
  });
  symptomId = symptom.id;

  await prisma.symptomLog.createMany({
    data: [
      { userId, symptomId, severity: 3, loggedAt: recentDate(2) },
      { userId, symptomId, severity: 7, loggedAt: recentDate(1) },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@insights.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/insights/trends', () => {
  it('returns 200 with mood trend as array of { date, avg }', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=mood&days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('date');
    expect(res.body[0]).toHaveProperty('avg');
    expect(typeof res.body[0].avg).toBe('number');
  });

  it('averages multiple logs on the same day', async () => {
    // Yesterday has 2 mood logs: score 4 and 4 → avg 4
    const res = await request(app)
      .get(`${TRENDS}?type=mood&days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const latestPoint = res.body[res.body.length - 1] as { date: string; avg: number };
    expect(latestPoint.avg).toBe(4);
  });

  it('returns results sorted ascending by date', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=mood&days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const dates = res.body.map((p: { date: string }) => p.date);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] >= dates[i - 1]).toBe(true);
    }
  });

  it('returns energy trend data', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=energy&days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns stress trend data', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=stress&days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns symptom severity trend for a valid symptom UUID', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=${symptomId}&days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('avg');
  });

  it('returns 404 for a non-existent symptom UUID', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=00000000-0000-0000-0000-000000000000&days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 422 when type param is missing', async () => {
    const res = await request(app)
      .get(`${TRENDS}?days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
    expect(typeof res.body.error).toBe('string');
  });

  it('defaults to 30 days when days param is invalid', async () => {
    const res = await request(app)
      .get(`${TRENDS}?type=mood&days=14`)
      .set('Authorization', `Bearer ${accessToken}`);

    // Not an error — invalid days defaults to 30
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`${TRENDS}?type=mood&days=7`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/insights/activity', () => {
  it('returns 200 with activity as array of { date, count }', async () => {
    const res = await request(app)
      .get(`${ACTIVITY}?days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('date');
    expect(res.body[0]).toHaveProperty('count');
  });

  it('each count is a non-negative integer', async () => {
    const res = await request(app)
      .get(`${ACTIVITY}?days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    for (const point of res.body as { count: number }[]) {
      expect(typeof point.count).toBe('number');
      expect(point.count).toBeGreaterThanOrEqual(0);
    }
  });

  it('aggregates across all log types', async () => {
    // Seeded 3 mood logs + 2 symptom logs = 5 total entries
    const res = await request(app)
      .get(`${ACTIVITY}?days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const total = (res.body as { count: number }[]).reduce((s, p) => s + p.count, 0);
    expect(total).toBeGreaterThanOrEqual(5);
  });

  it('returns results sorted ascending by date', async () => {
    const res = await request(app)
      .get(`${ACTIVITY}?days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const dates = res.body.map((p: { date: string }) => p.date);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] >= dates[i - 1]).toBe(true);
    }
  });

  it('defaults to 30 days when days param is invalid', async () => {
    const res = await request(app)
      .get(`${ACTIVITY}?days=99`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`${ACTIVITY}?days=7`);
    expect(res.status).toBe(401);
  });
});
