import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/symptom-logs';

const testUser = { email: 'user@sym-logs-delete.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let symptomId: string;
let logId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-delete.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const sym = await prisma.symptom.create({ data: { userId, name: 'Delete Headache' } });
  symptomId = sym.id;
});

beforeEach(async () => {
  // Fresh log for each test
  const log = await prisma.symptomLog.create({
    data: { userId, symptomId, severity: 5, notes: 'to be deleted' },
  });
  logId = log.id;
});

afterEach(async () => {
  await prisma.symptomLog.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-delete.welltrack' } } });
  await prisma.$disconnect();
});

describe('DELETE /api/symptom-logs/:id', () => {
  it('returns 204 and removes the log', async () => {
    const res = await request(app)
      .delete(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const gone = await prisma.symptomLog.findUnique({ where: { id: logId } });
    expect(gone).toBeNull();
  });

  it('returns 404 on a second delete of the same id', async () => {
    await request(app)
      .delete(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const res = await request(app)
      .delete(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 for another user's log", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@sym-logs-delete.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherLog = await prisma.symptomLog.create({
      data: { userId: otherId, symptomId, severity: 3 },
    });

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
