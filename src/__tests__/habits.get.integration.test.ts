import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const HABITS = '/api/habits';

const testUser = { email: 'user@habits-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let systemHabitId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-get.welltrack' } } });
  await prisma.habit.deleteMany({ where: { name: 'System Test Habit', userId: null } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const sys = await prisma.habit.create({ data: { userId: null, name: 'System Test Habit', trackingType: 'boolean' } });
  systemHabitId = sys.id;

  await prisma.habit.create({ data: { userId, name: 'My Custom Habit', trackingType: 'numeric', unit: 'cups' } });
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { id: systemHabitId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/habits', () => {
  it('returns 200 with an array including system and user habits', async () => {
    const res = await request(app)
      .get(HABITS)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((h: { id: string }) => h.id);
    expect(ids).toContain(systemHabitId);
  });

  it('each habit has the expected shape', async () => {
    const res = await request(app)
      .get(HABITS)
      .set('Authorization', `Bearer ${accessToken}`);

    const habit = res.body[0];
    expect(habit).toHaveProperty('id');
    expect(habit).toHaveProperty('name');
    expect(habit).toHaveProperty('trackingType');
    expect(habit).toHaveProperty('unit');
    expect(habit).toHaveProperty('isActive');
  });

  it('does not include another user\'s custom habits', async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@habits-get.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    await prisma.habit.create({ data: { userId: otherId, name: 'Other Private Habit', trackingType: 'boolean' } });

    const res = await request(app)
      .get(HABITS)
      .set('Authorization', `Bearer ${accessToken}`);

    const names = res.body.map((h: { name: string }) => h.name);
    expect(names).not.toContain('Other Private Habit');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(HABITS);
    expect(res.status).toBe(401);
  });

  it('respects limit query param', async () => {
    await prisma.habit.createMany({
      data: [
        { userId, name: 'Pagination Habit D', trackingType: 'boolean' },
        { userId, name: 'Pagination Habit E', trackingType: 'boolean' },
        { userId, name: 'Pagination Habit F', trackingType: 'boolean' },
      ],
    });

    const res = await request(app)
      .get(`${HABITS}?limit=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    await prisma.habit.deleteMany({ where: { userId, name: { startsWith: 'Pagination Habit' } } });
  });

  it('respects offset query param', async () => {
    const resAll = await request(app)
      .get(HABITS)
      .set('Authorization', `Bearer ${accessToken}`);
    const resOffset = await request(app)
      .get(`${HABITS}?offset=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resOffset.status).toBe(200);
    expect(resOffset.body.length).toBe(resAll.body.length - 1);
  });

  it('returns 422 for invalid limit', async () => {
    const res = await request(app)
      .get(`${HABITS}?limit=0`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/limit/);
  });

  it('returns 422 for invalid offset', async () => {
    const res = await request(app)
      .get(`${HABITS}?offset=-1`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/offset/);
  });
});
