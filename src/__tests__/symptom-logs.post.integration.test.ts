import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/symptom-logs';

const testUser = { email: 'user@sym-logs-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let ownedSymptomId: string;
let systemSymptomId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-post.welltrack' } } });
  await prisma.symptom.deleteMany({ where: { name: 'System Log Test', userId: null } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const owned = await prisma.symptom.create({ data: { userId, name: 'My Headache' } });
  ownedSymptomId = owned.id;

  const sys = await prisma.symptom.create({ data: { userId: null, name: 'System Log Test' } });
  systemSymptomId = sys.id;
});

afterAll(async () => {
  await prisma.symptom.deleteMany({ where: { id: systemSymptomId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sym-logs-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/symptom-logs', () => {
  it('returns 201 with the created log for an owned symptom', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: ownedSymptomId, severity: 7, notes: 'bad today' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId,
      symptomId: ownedSymptomId,
      severity: 7,
      notes: 'bad today',
    });
    expect(res.body.symptom).toMatchObject({ id: ownedSymptomId, name: 'My Headache' });
  });

  it('returns 201 for a system symptom (accessible to all users)', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemSymptomId, severity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.symptomId).toBe(systemSymptomId);
  });

  it('uses current time when loggedAt is omitted', async () => {
    const before = Date.now();
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: ownedSymptomId, severity: 5 });
    const after = Date.now();

    const loggedAt = new Date(res.body.loggedAt).getTime();
    expect(loggedAt).toBeGreaterThanOrEqual(before);
    expect(loggedAt).toBeLessThanOrEqual(after);
  });

  it('accepts a custom loggedAt for backfilling', async () => {
    const pastDate = '2024-06-15T10:00:00Z';
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: ownedSymptomId, severity: 4, loggedAt: pastDate });

    expect(res.status).toBe(201);
    expect(new Date(res.body.loggedAt).toISOString()).toBe(new Date(pastDate).toISOString());
  });

  it('returns 404 for a non-existent symptomId', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: 'doesnotexist', severity: 5 });

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's symptom", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@sym-logs-post.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherSym = await prisma.symptom.create({ data: { userId: otherId, name: 'Private' } });

    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: otherSym.id, severity: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 422 for missing symptomId', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 5 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for severity out of range (0)', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: ownedSymptomId, severity: 0 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for severity out of range (11)', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: ownedSymptomId, severity: 11 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for non-integer severity', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: ownedSymptomId, severity: 5.5 });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post(LOGS)
      .send({ symptomId: ownedSymptomId, severity: 5 });
    expect(res.status).toBe(401);
  });
});
