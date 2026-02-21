import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/mood-logs';

const testUser = { email: 'user@mood-logs-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-get.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  // Insert 4 logs at known timestamps
  await prisma.moodLog.createMany({
    data: [
      { userId, moodScore: 3, loggedAt: new Date('2025-01-08T10:00:00Z') },
      { userId, moodScore: 4, energyLevel: 3, loggedAt: new Date('2025-01-09T10:00:00Z') },
      { userId, moodScore: 5, stressLevel: 2, loggedAt: new Date('2025-01-10T10:00:00Z') },
      { userId, moodScore: 2, notes: 'rough day', loggedAt: new Date('2025-01-11T10:00:00Z') },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/mood-logs', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
  });

  it('each log has the expected shape', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    const log = res.body[0];
    expect(log).toHaveProperty('id');
    expect(log).toHaveProperty('userId');
    expect(log).toHaveProperty('moodScore');
    expect(log).toHaveProperty('energyLevel');
    expect(log).toHaveProperty('stressLevel');
    expect(log).toHaveProperty('notes');
    expect(log).toHaveProperty('loggedAt');
    expect(log).toHaveProperty('createdAt');
  });

  it('returns logs newest-first', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    const dates = res.body.map((l: { loggedAt: string }) => new Date(l.loggedAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('filters by startDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?startDate=2025-01-10T00:00:00Z`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('filters by endDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?endDate=2025-01-09T23:59:59Z`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('respects limit', async () => {
    const res = await request(app)
      .get(`${LOGS}?limit=2`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('respects offset', async () => {
    const res = await request(app)
      .get(`${LOGS}?offset=3`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('does not return another user\'s logs', async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@mood-logs-get.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    await prisma.moodLog.create({ data: { userId: otherId, moodScore: 1 } });

    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    const ids = res.body.map((l: { userId: string }) => l.userId);
    expect(ids.every((id: string) => id === userId)).toBe(true);
  });

  it('returns 422 for invalid startDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?startDate=notadate`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
  });

  it('returns 422 for negative limit', async () => {
    const res = await request(app)
      .get(`${LOGS}?limit=-1`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(LOGS);
    expect(res.status).toBe(401);
  });
});
