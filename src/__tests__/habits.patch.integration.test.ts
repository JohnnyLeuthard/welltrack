import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const HABITS = '/api/habits';

const testUser = { email: 'user@habits-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let habitId: string;
let systemHabitId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-patch.welltrack' } } });
  await prisma.habit.deleteMany({ where: { name: 'Patch System Habit', userId: null } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
  const sys = await prisma.habit.create({ data: { userId: null, name: 'Patch System Habit', trackingType: 'boolean' } });
  systemHabitId = sys.id;
});

beforeEach(async () => {
  const habit = await prisma.habit.create({ data: { userId, name: 'Test Habit', trackingType: 'numeric', unit: 'reps' } });
  habitId = habit.id;
});

afterEach(async () => {
  await prisma.habit.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { id: systemHabitId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/habits/:id', () => {
  it('updates name', async () => {
    const res = await request(app)
      .patch(`${HABITS}/${habitId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Habit' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Habit');
  });

  it('updates unit and accepts null to clear', async () => {
    const res = await request(app)
      .patch(`${HABITS}/${habitId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ unit: null });

    expect(res.status).toBe(200);
    expect(res.body.unit).toBeNull();
  });

  it('sets isActive to false', async () => {
    const res = await request(app)
      .patch(`${HABITS}/${habitId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('returns 403 for system habits', async () => {
    const res = await request(app)
      .patch(`${HABITS}/${systemHabitId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it("returns 403 for another user's habit", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@habits-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherHabit = await prisma.habit.create({ data: { userId: otherId, name: 'Other', trackingType: 'boolean' } });

    const res = await request(app)
      .patch(`${HABITS}/${otherHabit.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${HABITS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(`${HABITS}/${habitId}`).send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});
