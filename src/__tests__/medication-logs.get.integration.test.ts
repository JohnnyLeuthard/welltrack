import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/medication-logs';

const testUser = { email: 'user@med-logs-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let medId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@med-logs-get.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const med = await prisma.medication.create({ data: { userId, name: 'Aspirin' } });
  medId = med.id;

  await prisma.medicationLog.createMany({
    data: [
      { userId, medicationId: medId, taken: true, createdAt: new Date('2025-01-08T10:00:00Z') },
      { userId, medicationId: medId, taken: false, createdAt: new Date('2025-01-09T10:00:00Z') },
      { userId, medicationId: medId, taken: true, createdAt: new Date('2025-01-10T10:00:00Z') },
      { userId, medicationId: medId, taken: true, notes: 'with food', createdAt: new Date('2025-01-11T10:00:00Z') },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@med-logs-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/medication-logs', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
  });

  it('each log has the expected shape including nested medication', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    const log = res.body[0];
    expect(log).toHaveProperty('id');
    expect(log).toHaveProperty('userId');
    expect(log).toHaveProperty('medicationId');
    expect(log).toHaveProperty('taken');
    expect(log).toHaveProperty('takenAt');
    expect(log).toHaveProperty('notes');
    expect(log).toHaveProperty('createdAt');
    expect(log.medication).toMatchObject({ id: medId, name: 'Aspirin' });
  });

  it('returns logs newest-first', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    const dates = res.body.map((l: { createdAt: string }) => new Date(l.createdAt).getTime());
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

  it('respects limit', async () => {
    const res = await request(app)
      .get(`${LOGS}?limit=2`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('does not return another user\'s logs', async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@med-logs-get.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherMed = await prisma.medication.create({ data: { userId: otherId, name: 'Other' } });
    await prisma.medicationLog.create({ data: { userId: otherId, medicationId: otherMed.id, taken: true } });

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

  it('returns 401 without a token', async () => {
    const res = await request(app).get(LOGS);
    expect(res.status).toBe(401);
  });
});
