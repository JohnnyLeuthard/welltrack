import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/habit-logs';

const testUser = { email: 'user@habit-logs-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let booleanHabitId: string;
let numericHabitId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habit-logs-get.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const boolHabit = await prisma.habit.create({
    data: { userId, name: 'Exercise', trackingType: 'boolean' },
  });
  booleanHabitId = boolHabit.id;

  const numHabit = await prisma.habit.create({
    data: { userId, name: 'Water', trackingType: 'numeric', unit: 'glasses' },
  });
  numericHabitId = numHabit.id;

  // Create a few logs
  await prisma.habitLog.createMany({
    data: [
      { userId, habitId: booleanHabitId, valueBoolean: true, loggedAt: new Date('2025-01-01') },
      { userId, habitId: numericHabitId, valueNumeric: 8, loggedAt: new Date('2025-01-02') },
      { userId, habitId: booleanHabitId, valueBoolean: false, loggedAt: new Date('2025-01-03') },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habit-logs-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/habit-logs', () => {
  it('returns 200 with all logs for the user', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('each log has expected shape with nested habit', async () => {
    const res = await request(app)
      .get(LOGS)
      .set('Authorization', `Bearer ${accessToken}`);

    const log = res.body[0] as Record<string, unknown>;
    expect(log).toHaveProperty('id');
    expect(log).toHaveProperty('userId');
    expect(log).toHaveProperty('habitId');
    expect(log).toHaveProperty('loggedAt');
    expect(log).toHaveProperty('habit');
    const habit = log['habit'] as Record<string, unknown>;
    expect(habit).toHaveProperty('id');
    expect(habit).toHaveProperty('name');
    expect(habit).toHaveProperty('trackingType');
  });

  it('filters by startDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?startDate=2025-01-02`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    for (const log of res.body as Array<{ loggedAt: string }>) {
      expect(new Date(log.loggedAt).getTime()).toBeGreaterThanOrEqual(new Date('2025-01-02').getTime());
    }
  });

  it('filters by endDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?endDate=2025-01-01T23:59:59Z`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    for (const log of res.body as Array<{ loggedAt: string }>) {
      expect(new Date(log.loggedAt).getTime()).toBeLessThanOrEqual(new Date('2025-01-01T23:59:59Z').getTime());
    }
  });

  it('respects limit and offset', async () => {
    const res = await request(app)
      .get(`${LOGS}?limit=1&offset=0`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('returns 422 for invalid startDate', async () => {
    const res = await request(app)
      .get(`${LOGS}?startDate=not-a-date`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(LOGS);
    expect(res.status).toBe(401);
  });
});
