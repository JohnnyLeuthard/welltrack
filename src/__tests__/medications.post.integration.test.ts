import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const MEDS = '/api/medications';

const testUser = { email: 'user@medications-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-post.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/medications', () => {
  it('returns 201 with name only', async () => {
    const res = await request(app)
      .post(MEDS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Aspirin' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId, name: 'Aspirin', dosage: null, frequency: null, isActive: true });
    expect(res.body).toHaveProperty('id');
  });

  it('returns 201 with all optional fields', async () => {
    const res = await request(app)
      .post(MEDS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ibuprofen', dosage: '200mg', frequency: 'twice daily' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ibuprofen', dosage: '200mg', frequency: 'twice daily' });
  });

  it('trims whitespace from name', async () => {
    const res = await request(app)
      .post(MEDS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '  Trimmed  ' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trimmed');
  });

  it('returns 422 for missing name', async () => {
    const res = await request(app)
      .post(MEDS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dosage: '100mg' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for empty name', async () => {
    const res = await request(app)
      .post(MEDS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '   ' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(MEDS).send({ name: 'Aspirin' });
    expect(res.status).toBe(401);
  });
});
