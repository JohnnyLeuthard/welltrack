import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/symptom-logs';

const testUser = { email: 'user@sym-logs-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let symptomId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-get.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  // Create a symptom to log against
  const sym = await prisma.symptom.create({ data: { userId, name: 'Test Headache' } });
  symptomId = sym.id;

  // Seed several logs at known times
  const base = new Date('2025-01-10T12:00:00Z');
  await prisma.symptomLog.createMany({
    data: [
      { userId, symptomId, severity: 7, loggedAt: new Date('2025-01-08T12:00:00Z') },
      { userId, symptomId, severity: 5, notes: 'mild', loggedAt: new Date('2025-01-09T12:00:00Z') },
      { userId, symptomId, severity: 9, loggedAt: base },
      { userId, symptomId, severity: 3, loggedAt: new Date('2025-01-11T12:00:00Z') },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/symptom-logs', () => {
  it('returns 200 with an array of the user\'s logs', async () => {
    const res = await request(app).get(LOGS).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });

  it('each log has the expected shape including nested symptom', async () => {
    const res = await request(app).get(LOGS).set('Authorization', `Bearer ${accessToken}`);
    const log = res.body[0];

    expect(log).toHaveProperty('id');
    expect(log).toHaveProperty('userId', userId);
    expect(log).toHaveProperty('symptomId');
    expect(log).toHaveProperty('severity');
    expect(log).toHaveProperty('notes');
    expect(log).toHaveProperty('loggedAt');
    expect(log).toHaveProperty('createdAt');
    expect(log.symptom).toMatchObject({ id: symptomId, name: 'Test Headache' });
  });

  it('results are ordered newest first', async () => {
    const res = await request(app).get(LOGS).set('Authorization', `Bearer ${accessToken}`);
    const dates = (res.body as { loggedAt: string }[]).map((l) => new Date(l.loggedAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('filters by startDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?startDate=2025-01-10T00:00:00Z`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const dates = (res.body as { loggedAt: string }[]).map((l) => new Date(l.loggedAt));
    dates.forEach((d) => expect(d.getTime()).toBeGreaterThanOrEqual(new Date('2025-01-10').getTime()));
  });

  it('filters by endDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?endDate=2025-01-09T23:59:59Z`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const dates = (res.body as { loggedAt: string }[]).map((l) => new Date(l.loggedAt));
    dates.forEach((d) => expect(d.getTime()).toBeLessThanOrEqual(new Date('2025-01-09T23:59:59Z').getTime()));
  });

  it('respects limit', async () => {
    const res = await request(app)
      .get(`${LOGS}?limit=2`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('respects offset', async () => {
    const allRes = await request(app).get(LOGS).set('Authorization', `Bearer ${accessToken}`);
    const offsetRes = await request(app)
      .get(`${LOGS}?limit=2&offset=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(offsetRes.body[0].id).toBe(allRes.body[1].id);
  });

  it("does not return another user's logs", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@sym-logs-get.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    await prisma.symptomLog.create({
      data: { userId: otherId, symptomId, severity: 10 },
    });

    const res = await request(app).get(LOGS).set('Authorization', `Bearer ${accessToken}`);
    const leaked = (res.body as { userId: string }[]).find((l) => l.userId === otherId);
    expect(leaked).toBeUndefined();
  });

  it('returns 422 for an invalid startDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?startDate=notadate`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
  });

  it('returns 422 for a negative limit', async () => {
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
