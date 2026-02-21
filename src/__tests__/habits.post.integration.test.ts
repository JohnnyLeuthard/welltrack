import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const HABITS = '/api/habits';

const testUser = { email: 'user@habits-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-post.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@habits-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/habits', () => {
  it('returns 201 for boolean trackingType', async () => {
    const res = await request(app)
      .post(HABITS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Exercise', trackingType: 'boolean' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId, name: 'Exercise', trackingType: 'boolean', unit: null, isActive: true });
  });

  it('returns 201 for numeric trackingType with unit', async () => {
    const res = await request(app)
      .post(HABITS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Water Intake', trackingType: 'numeric', unit: 'glasses' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ trackingType: 'numeric', unit: 'glasses' });
  });

  it('returns 201 for duration trackingType', async () => {
    const res = await request(app)
      .post(HABITS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Sleep', trackingType: 'duration' });

    expect(res.status).toBe(201);
    expect(res.body.trackingType).toBe('duration');
  });

  it('returns 422 for missing name', async () => {
    const res = await request(app)
      .post(HABITS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ trackingType: 'boolean' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid trackingType', async () => {
    const res = await request(app)
      .post(HABITS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test', trackingType: 'invalid' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(HABITS).send({ name: 'Exercise', trackingType: 'boolean' });
    expect(res.status).toBe(401);
  });
});
