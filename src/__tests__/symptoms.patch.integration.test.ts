import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const SYMPTOMS = '/api/symptoms';

const testUser = { email: 'user@symptoms-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
/** A custom symptom owned by the test user */
let ownedSymptomId: string;
/** A system symptom (userId null) */
let systemSymptomId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-patch.welltrack' } } });
  await prisma.symptom.deleteMany({ where: { name: 'Test System Patch', userId: null } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const owned = await prisma.symptom.create({
    data: { userId, name: 'Original Name', category: 'Original Cat' },
  });
  ownedSymptomId = owned.id;

  const sys = await prisma.symptom.create({
    data: { userId: null, name: 'Test System Patch', category: 'System' },
  });
  systemSymptomId = sys.id;
});

afterAll(async () => {
  await prisma.symptom.deleteMany({ where: { id: { in: [ownedSymptomId, systemSymptomId] } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/symptoms/:id', () => {
  it('updates name and returns the updated symptom', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.id).toBe(ownedSymptomId);
  });

  it('updates category', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'New Category' });

    expect(res.status).toBe(200);
    expect(res.body.category).toBe('New Category');
  });

  it('accepts null to clear category', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: null });

    expect(res.status).toBe(200);
    expect(res.body.category).toBeNull();
  });

  it('updates isActive', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('returns 403 when attempting to update a system symptom', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${systemSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hacked System' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it("returns 403 when attempting to update another user's symptom", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@symptoms-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherSymptom = await prisma.symptom.create({
      data: { userId: otherId, name: 'Other Symptom' },
    });

    const res = await request(app)
      .patch(`${SYMPTOMS}/${otherSymptom.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Stolen' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent symptom id', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('returns 422 for an empty name', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '   ' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for a non-boolean isActive', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: 'yes' });

    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`${SYMPTOMS}/${ownedSymptomId}`)
      .send({ name: 'Hacker' });
    expect(res.status).toBe(401);
  });
});
