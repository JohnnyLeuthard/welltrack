import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const HABITS = '/api/habits';

const testUser = { email: 'user@habits-delete.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let habitId: string;
let systemHabitId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-delete.welltrack' } } });
  await prisma.habit.deleteMany({ where: { name: 'Delete System Habit', userId: null } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
  const sys = await prisma.habit.create({ data: { userId: null, name: 'Delete System Habit', trackingType: 'boolean' } });
  systemHabitId = sys.id;
});

beforeEach(async () => {
  const habit = await prisma.habit.create({ data: { userId, name: 'Custom Habit', trackingType: 'boolean' } });
  habitId = habit.id;
});

afterEach(async () => {
  await prisma.habit.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { id: systemHabitId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-delete.welltrack' } } });
  await prisma.$disconnect();
});

describe('DELETE /api/habits/:id', () => {
  it('returns 204 and removes the habit', async () => {
    const res = await request(app)
      .delete(`${HABITS}/${habitId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    const gone = await prisma.habit.findUnique({ where: { id: habitId } });
    expect(gone).toBeNull();
  });

  it('returns 403 for system habits', async () => {
    const res = await request(app)
      .delete(`${HABITS}/${systemHabitId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 403 for another user's habit", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@habits-delete.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherHabit = await prisma.habit.create({ data: { userId: otherId, name: 'Other', trackingType: 'boolean' } });

    const res = await request(app)
      .delete(`${HABITS}/${otherHabit.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .delete(`${HABITS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${HABITS}/${habitId}`);
    expect(res.status).toBe(401);
  });
});
