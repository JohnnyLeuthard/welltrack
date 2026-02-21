import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/medication-logs';

const testUser = { email: 'user@med-logs-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let medId: string;
let logId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@med-logs-patch.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
  const med = await prisma.medication.create({ data: { userId, name: 'Aspirin' } });
  medId = med.id;
});

beforeEach(async () => {
  const log = await prisma.medicationLog.create({
    data: { userId, medicationId: medId, taken: true, notes: 'original' },
  });
  logId = log.id;
});

afterEach(async () => {
  await prisma.medicationLog.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@med-logs-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/medication-logs/:id', () => {
  it('updates taken to false', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taken: false });

    expect(res.status).toBe(200);
    expect(res.body.taken).toBe(false);
  });

  it('updates notes and accepts null to clear', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: null });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBeNull();
  });

  it('updates takenAt', async () => {
    const newDate = '2024-03-01T08:00:00Z';
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ takenAt: newDate });

    expect(res.status).toBe(200);
    expect(new Date(res.body.takenAt).toISOString()).toBe(new Date(newDate).toISOString());
  });

  it("returns 403 for another user's log", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@med-logs-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherMed = await prisma.medication.create({ data: { userId: otherId, name: 'Other' } });
    const otherLog = await prisma.medicationLog.create({
      data: { userId: otherId, medicationId: otherMed.id, taken: true },
    });

    const res = await request(app)
      .patch(`${LOGS}/${otherLog.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taken: false });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${LOGS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taken: false });
    expect(res.status).toBe(404);
  });

  it('returns 422 for invalid takenAt', async () => {
    const res = await request(app)
      .patch(`${LOGS}/${logId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ takenAt: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(`${LOGS}/${logId}`).send({ taken: false });
    expect(res.status).toBe(401);
  });
});
