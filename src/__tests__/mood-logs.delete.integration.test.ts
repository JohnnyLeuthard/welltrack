import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/mood-logs';

const testUser = { email: 'user@mood-logs-delete.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let logId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-delete.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

beforeEach(async () => {
  const log = await prisma.moodLog.create({ data: { userId, moodScore: 3 } });
  logId = log.id;
});

afterEach(async () => {
  await prisma.moodLog.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-delete.welltrack' } } });
  await prisma.$disconnect();
});

describe('DELETE /api/mood-logs/:id', () => {
  it('returns 204 and removes the log', async () => {
    const res = await request(app)
      .delete(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    const gone = await prisma.moodLog.findUnique({ where: { id: logId } });
    expect(gone).toBeNull();
  });

  it('returns 404 on a second delete of the same id', async () => {
    await request(app).delete(`${LOGS}/${logId}`).set('Authorization', `Bearer ${accessToken}`);
    const res = await request(app).delete(`${LOGS}/${logId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 403 for another user's log", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@mood-logs-delete.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherLog = await prisma.moodLog.create({ data: { userId: otherId, moodScore: 2 } });

    const res = await request(app)
      .delete(`${LOGS}/${otherLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .delete(`${LOGS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${LOGS}/${logId}`);
    expect(res.status).toBe(401);
  });
});
