import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/mood-logs';

const testUser = { email: 'user@mood-logs-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let logId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-patch.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

beforeEach(async () => {
  const log = await prisma.moodLog.create({
    data: { userId, moodScore: 3, energyLevel: 3, notes: 'original' },
  });
  logId = log.id;
});

afterEach(async () => {
  await prisma.moodLog.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/mood-logs/:id', () => {
  it('updates moodScore', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 5 });

    expect(res.status).toBe(200);
    expect(res.body.moodScore).toBe(5);
    expect(res.body.id).toBe(logId);
  });

  it('updates notes and accepts null to clear', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBeNull();
  });

  it('updates energyLevel and stressLevel', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ energyLevel: 5, stressLevel: 1 });

    expect(res.status).toBe(200);
    expect(res.body.energyLevel).toBe(5);
    expect(res.body.stressLevel).toBe(1);
  });

  it('updates loggedAt', async () => {
    const newDate = '2024-03-01T08:00:00Z';
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ loggedAt: newDate });

    expect(res.status).toBe(200);
    expect(new Date(res.body.loggedAt).toISOString()).toBe(new Date(newDate).toISOString());
  });

  it("returns 403 for another user's log", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@mood-logs-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherLog = await prisma.moodLog.create({ data: { userId: otherId, moodScore: 2 } });

    const res = await request(app)
      .patch(`${LOGS}/${otherLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 1 });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${LOGS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 3 });
    expect(res.status).toBe(404);
  });

  it('returns 422 for moodScore out of range', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 6 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid loggedAt', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ loggedAt: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(`${LOGS}/${logId}`).send({ moodScore: 3 });
    expect(res.status).toBe(401);
  });
});
