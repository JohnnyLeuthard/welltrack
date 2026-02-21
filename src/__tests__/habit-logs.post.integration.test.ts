import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/habit-logs';

const testUser = { email: 'user@habit-logs-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let booleanHabitId: string;
let numericHabitId: string;
let durationHabitId: string;
let systemHabitId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habit-logs-post.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const boolHabit = await prisma.habit.create({
    data: { userId, name: 'Exercise Log', trackingType: 'boolean' },
  });
  booleanHabitId = boolHabit.id;

  const numHabit = await prisma.habit.create({
    data: { userId, name: 'Water Log', trackingType: 'numeric', unit: 'glasses' },
  });
  numericHabitId = numHabit.id;

  const durHabit = await prisma.habit.create({
    data: { userId, name: 'Sleep Log', trackingType: 'duration', unit: 'minutes' },
  });
  durationHabitId = durHabit.id;

  // Create a system habit (userId = null) to test logging against system habits
  const sysHabit = await prisma.habit.create({
    data: { userId: null, name: 'System Habit Log', trackingType: 'boolean' },
  });
  systemHabitId = sysHabit.id;
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { name: 'System Habit Log' } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habit-logs-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/habit-logs', () => {
  it('creates a boolean habit log and returns 201', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: booleanHabitId, valueBoolean: true });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.valueBoolean).toBe(true);
    expect(res.body.habit.trackingType).toBe('boolean');
  });

  it('creates a numeric habit log and returns 201', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: numericHabitId, valueNumeric: 8 });

    expect(res.status).toBe(201);
    expect(res.body.valueNumeric).toBe(8);
  });

  it('creates a duration habit log and returns 201', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: durationHabitId, valueDuration: 480 });

    expect(res.status).toBe(201);
    expect(res.body.valueDuration).toBe(480);
  });

  it('allows logging against a system habit', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: systemHabitId, valueBoolean: false });

    expect(res.status).toBe(201);
    expect(res.body.habitId).toBe(systemHabitId);
  });

  it('returns 422 when boolean habit is missing valueBoolean', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: booleanHabitId, valueNumeric: 1 });

    expect(res.status).toBe(422);
  });

  it('returns 422 when numeric habit is missing valueNumeric', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: numericHabitId, valueBoolean: true });

    expect(res.status).toBe(422);
  });

  it('returns 422 when duration habit is missing valueDuration', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: durationHabitId, valueNumeric: 5 });

    expect(res.status).toBe(422);
  });

  it('returns 422 when habitId is missing', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valueBoolean: true });

    expect(res.status).toBe(422);
  });

  it('returns 404 for a non-existent habitId', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: 'nonexistentid', valueBoolean: true });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's private habit", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@habit-logs-post.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherHabit = await prisma.habit.create({
      data: { userId: otherId, name: 'Other Habit', trackingType: 'boolean' },
    });

    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ habitId: otherHabit.id, valueBoolean: true });

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post(LOGS)
      .send({ habitId: booleanHabitId, valueBoolean: true });

    expect(res.status).toBe(401);
  });
});
