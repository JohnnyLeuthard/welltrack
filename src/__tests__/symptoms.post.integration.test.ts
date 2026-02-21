import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const SYMPTOMS = '/api/symptoms';

const testUser = { email: 'user@symptoms-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-post.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@symptoms-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/symptoms', () => {
  it('returns 201 with the created symptom', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Migraine', category: 'Neurological' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Migraine',
      category: 'Neurological',
      isActive: true,
      userId,
    });
    expect(res.body).toHaveProperty('id');
  });

  it('persists the symptom in the database', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Nausea' });

    const stored = await prisma.symptom.findUnique({ where: { id: res.body.id } });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(userId);
  });

  it('works without a category (category is null)', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Fatigue' });

    expect(res.status).toBe(201);
    expect(res.body.category).toBeNull();
  });

  it('trims whitespace from name and category', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '  Dizziness  ', category: '  Balance  ' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Dizziness');
    expect(res.body.category).toBe('Balance');
  });

  it('sets userId to the authenticated user (not system)', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Custom Ache' });

    expect(res.body.userId).toBe(userId);
    expect(res.body.userId).not.toBeNull();
  });

  it('returns 422 for missing name', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'Test' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for empty name', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '   ' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for non-string category', async () => {
    const res = await request(app)
      .post(SYMPTOMS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Valid Name', category: 42 });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(SYMPTOMS).send({ name: 'Hacked' });
    expect(res.status).toBe(401);
  });
});
