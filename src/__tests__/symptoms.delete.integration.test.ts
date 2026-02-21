import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const SYMPTOMS = '/api/symptoms';

const testUser = { email: 'user@symptoms-delete.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let systemSymptomId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-delete.welltrack' } } });
  await prisma.symptom.deleteMany({ where: { name: 'Test System Delete', userId: null } });

  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const sys = await prisma.symptom.create({
    data: { userId: null, name: 'Test System Delete' },
  });
  systemSymptomId = sys.id;
});

afterAll(async () => {
  await prisma.symptom.deleteMany({ where: { id: systemSymptomId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-delete.welltrack' } } });
  await prisma.$disconnect();
});

describe('DELETE /api/symptoms/:id', () => {
  it('returns 200 and deletes the symptom', async () => {
    const symptom = await prisma.symptom.create({
      data: { userId, name: 'To Be Deleted' },
    });

    const res = await request(app)
      .delete(`${SYMPTOMS}/${symptom.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const gone = await prisma.symptom.findUnique({ where: { id: symptom.id } });
    expect(gone).toBeNull();
  });

  it('returns 403 when attempting to delete a system symptom', async () => {
    const res = await request(app)
      .delete(`${SYMPTOMS}/${systemSymptomId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');

    // System symptom must still exist
    const still = await prisma.symptom.findUnique({ where: { id: systemSymptomId } });
    expect(still).not.toBeNull();
  });

  it("returns 403 when attempting to delete another user's symptom", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@symptoms-delete.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherSymptom = await prisma.symptom.create({
      data: { userId: otherId, name: 'Other Private Symptom' },
    });

    const res = await request(app)
      .delete(`${SYMPTOMS}/${otherSymptom.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);

    // Other user's symptom must still exist
    const still = await prisma.symptom.findUnique({ where: { id: otherSymptom.id } });
    expect(still).not.toBeNull();
  });

  it('returns 404 for a non-existent symptom id', async () => {
    const res = await request(app)
      .delete(`${SYMPTOMS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const symptom = await prisma.symptom.create({
      data: { userId, name: 'Should Not Delete' },
    });

    const res = await request(app).delete(`${SYMPTOMS}/${symptom.id}`);
    expect(res.status).toBe(401);

    // Cleanup
    await prisma.symptom.deleteMany({ where: { id: symptom.id } });
  });
});
