import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const SYMPTOMS = '/api/symptoms';

const testUser = { email: 'user@symptoms-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let systemSymptomId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-get.welltrack' } } });
  // Clean any leftover test system symptoms
  await prisma.symptom.deleteMany({ where: { name: 'Test System Headache', userId: null } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  // Insert a system symptom (userId = null) so tests don't rely on seed data
  const sys = await prisma.symptom.create({
    data: { userId: null, name: 'Test System Headache', category: 'Neurological' },
  });
  systemSymptomId = sys.id;
});

afterAll(async () => {
  await prisma.symptom.deleteMany({ where: { id: systemSymptomId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/symptoms', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get(SYMPTOMS).set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('includes system symptoms (userId null)', async () => {
    const res = await request(app).get(SYMPTOMS).set('Authorization', `Bearer ${accessToken}`);
    const systemSymptoms = (res.body as { userId: string | null }[]).filter(
      (s) => s.userId === null,
    );
    expect(systemSymptoms.length).toBeGreaterThan(0);
  });

  it('each symptom has the expected shape', async () => {
    const res = await request(app).get(SYMPTOMS).set('Authorization', `Bearer ${accessToken}`);
    const first = res.body[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('userId');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('isActive');
  });

  it("includes the user's own custom symptoms", async () => {
    await prisma.symptom.create({ data: { userId, name: 'My Custom Pain', category: 'Test' } });

    const res = await request(app).get(SYMPTOMS).set('Authorization', `Bearer ${accessToken}`);
    const custom = (res.body as { name: string }[]).find((s) => s.name === 'My Custom Pain');
    expect(custom).toBeDefined();

    await prisma.symptom.deleteMany({ where: { userId, name: 'My Custom Pain' } });
  });

  it("does not include another user's custom symptoms", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@symptoms-get.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    await prisma.symptom.create({
      data: { userId: otherId, name: 'Other User Secret Symptom', category: 'Hidden' },
    });

    const res = await request(app).get(SYMPTOMS).set('Authorization', `Bearer ${accessToken}`);
    const leaked = (res.body as { name: string }[]).find(
      (s) => s.name === 'Other User Secret Symptom',
    );
    expect(leaked).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(SYMPTOMS);
    expect(res.status).toBe(401);
  });

  it('respects limit query param', async () => {
    await prisma.symptom.createMany({
      data: [
        { userId, name: 'Pagination Test A', category: 'Test' },
        { userId, name: 'Pagination Test B', category: 'Test' },
        { userId, name: 'Pagination Test C', category: 'Test' },
      ],
    });

    const res = await request(app)
      .get(`${SYMPTOMS}?limit=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    await prisma.symptom.deleteMany({ where: { userId, name: { startsWith: 'Pagination Test' } } });
  });

  it('respects offset query param', async () => {
    await prisma.symptom.deleteMany({ where: { userId } });
    await prisma.symptom.createMany({
      data: [
        { userId, name: 'Offset Alpha', category: 'Test' },
        { userId, name: 'Offset Beta', category: 'Test' },
      ],
    });

    const resAll = await request(app)
      .get(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`);
    const resOffset = await request(app)
      .get(`${SYMPTOMS}?offset=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resOffset.status).toBe(200);
    expect(resOffset.body.length).toBe(resAll.body.length - 1);

    await prisma.symptom.deleteMany({ where: { userId } });
  });

  it('returns 422 for invalid limit', async () => {
    const res = await request(app)
      .get(`${SYMPTOMS}?limit=0`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/limit/);
  });

  it('returns 422 for invalid offset', async () => {
    const res = await request(app)
      .get(`${SYMPTOMS}?offset=-1`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/offset/);
  });
});
