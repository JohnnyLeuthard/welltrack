import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const MEDS = '/api/medications';

const testUser = { email: 'user@medications-get.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-get.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  await prisma.medication.createMany({
    data: [
      { userId, name: 'Aspirin', dosage: '100mg', frequency: 'daily', isActive: true },
      { userId, name: 'Ibuprofen', dosage: '200mg', frequency: 'as needed', isActive: true },
      { userId, name: 'OldMed', isActive: false },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-get.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/medications', () => {
  it('returns 200 with active medications only', async () => {
    const res = await request(app)
      .get(MEDS)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body.every((m: { isActive: boolean }) => m.isActive)).toBe(true);
  });

  it('each medication has the expected shape', async () => {
    const res = await request(app)
      .get(MEDS)
      .set('Authorization', `Bearer ${accessToken}`);

    const med = res.body[0];
    expect(med).toHaveProperty('id');
    expect(med).toHaveProperty('userId');
    expect(med).toHaveProperty('name');
    expect(med).toHaveProperty('dosage');
    expect(med).toHaveProperty('frequency');
    expect(med).toHaveProperty('isActive');
    expect(med).toHaveProperty('createdAt');
  });

  it('returns medications sorted alphabetically by name', async () => {
    const res = await request(app)
      .get(MEDS)
      .set('Authorization', `Bearer ${accessToken}`);

    const names = res.body.map((m: { name: string }) => m.name);
    expect(names).toEqual([...names].sort());
  });

  it('does not return another user\'s medications', async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@medications-get.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    await prisma.medication.create({ data: { userId: otherId, name: 'Other Med' } });

    const res = await request(app)
      .get(MEDS)
      .set('Authorization', `Bearer ${accessToken}`);

    const ids = res.body.map((m: { userId: string }) => m.userId);
    expect(ids.every((id: string) => id === userId)).toBe(true);
  });

  it('returns empty array when user has no active medications', async () => {
    const emptyReg = await request(app)
      .post(REGISTER)
      .send({ email: 'empty@medications-get.welltrack', password: 'password123' });
    const emptyLogin = await request(app)
      .post(LOGIN)
      .send({ email: 'empty@medications-get.welltrack', password: 'password123' });
    const emptyToken = emptyLogin.body.accessToken as string;

    const res = await request(app)
      .get(MEDS)
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(MEDS);
    expect(res.status).toBe(401);
  });
});
