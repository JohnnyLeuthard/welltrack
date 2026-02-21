import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/symptom-logs';

const testUser = { email: 'user@sym-logs-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let symptomId: string;
let logId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-patch.welltrack' } } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const sym = await prisma.symptom.create({ data: { userId, name: 'Patch Headache' } });
  symptomId = sym.id;
});

beforeEach(async () => {
  // Fresh log for each test
  const log = await prisma.symptomLog.create({
    data: { userId, symptomId, severity: 5, notes: 'original' },
  });
  logId = log.id;
});

afterEach(async () => {
  await prisma.symptomLog.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/symptom-logs/:id', () => {
  it('updates severity', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 9 });

    expect(res.status).toBe(200);
    expect(res.body.severity).toBe(9);
    expect(res.body.id).toBe(logId);
  });

  it('updates notes', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: 'much better' });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('much better');
  });

  it('accepts null to clear notes', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBeNull();
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
      .send({ email: 'other@sym-logs-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherLog = await prisma.symptomLog.create({
      data: { userId: otherId, symptomId, severity: 3 },
    });

    const res = await request(app)
      .patch(`${LOGS}/${otherLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 1 });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${LOGS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 422 for severity out of range', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 0 });

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
    const res = await request(app).patch(`${LOGS}/${logId}`).send({ severity: 5 });
    expect(res.status).toBe(401);
  });
});
