import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/habit-logs';

const testUser = { email: 'user@habit-logs-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let habitId: string;
let logId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habit-logs-patch.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const habit = await prisma.habit.create({
    data: { userId, name: 'Exercise Patch', trackingType: 'boolean' },
  });
  habitId = habit.id;
});

beforeEach(async () => {
  const log = await prisma.habitLog.create({
    data: { userId, habitId, valueBoolean: true },
  });
  logId = log.id;
});

afterEach(async () => {
  await prisma.habitLog.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habit-logs-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/habit-logs/:id', () => {
  it('updates the log and returns 200', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valueBoolean: false, notes: 'Skipped today' });

    expect(res.status).toBe(200);
    expect(res.body.valueBoolean).toBe(false);
    expect(res.body.notes).toBe('Skipped today');
  });

  it('updates the loggedAt timestamp', async () => {
    const newDate = '2025-06-15T08:00:00.000Z';
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ loggedAt: newDate });

    expect(res.status).toBe(200);
    expect(new Date(res.body.loggedAt as string).toISOString()).toBe(newDate);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .patch(`${LOGS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valueBoolean: false });

    expect(res.status).toBe(404);
  });

  it("returns 403 for another user's log", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@habit-logs-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherHabit = await prisma.habit.create({
      data: { userId: otherId, name: 'Other Habit Patch', trackingType: 'boolean' },
    });
    const otherLog = await prisma.habitLog.create({
      data: { userId: otherId, habitId: otherHabit.id, valueBoolean: true },
    });

    const res = await request(app)
      .patch(`${LOGS}/${otherLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valueBoolean: false });

    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid loggedAt', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ loggedAt: 'not-a-date' });

    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .send({ valueBoolean: false });

    expect(res.status).toBe(401);
  });
});
