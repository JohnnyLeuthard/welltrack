import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const MEDS = '/api/medications';

const testUser = { email: 'user@medications-delete.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let medId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-delete.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

beforeEach(async () => {
  const med = await prisma.medication.create({ data: { userId, name: 'Aspirin' } });
  medId = med.id;
});

afterEach(async () => {
  await prisma.medication.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-delete.welltrack' } } });
  await prisma.$disconnect();
});

describe('DELETE /api/medications/:id', () => {
  it('returns 204 and removes the medication', async () => {
    const res = await request(app)
      .delete(`${MEDS}/${medId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    const gone = await prisma.medication.findUnique({ where: { id: medId } });
    expect(gone).toBeNull();
  });

  it('returns 404 on a second delete of the same id', async () => {
    await request(app).delete(`${MEDS}/${medId}`).set('Authorization', `Bearer ${accessToken}`);
    const res = await request(app).delete(`${MEDS}/${medId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 403 for another user's medication", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@medications-delete.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherMed = await prisma.medication.create({ data: { userId: otherId, name: 'Other' } });

    const res = await request(app)
      .delete(`${MEDS}/${otherMed.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request(app)
      .delete(`${MEDS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${MEDS}/${medId}`);
    expect(res.status).toBe(401);
  });
});
