import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/mood-logs';

const testUser = { email: 'user@mood-logs-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-post.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@mood-logs-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/mood-logs', () => {
  it('returns 201 with required fields only', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 3 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId, moodScore: 3, energyLevel: null, stressLevel: null, notes: null });
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('loggedAt');
  });

  it('returns 201 with all optional fields', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 4, energyLevel: 3, stressLevel: 2, notes: 'feeling ok' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ moodScore: 4, energyLevel: 3, stressLevel: 2, notes: 'feeling ok' });
  });

  it('uses current time when loggedAt is omitted', async () => {
    const before = Date.now();
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 2 });
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
      .send({ moodScore: 5, loggedAt: pastDate });

    expect(res.status).toBe(201);
    expect(new Date(res.body.loggedAt).toISOString()).toBe(new Date(pastDate).toISOString());
  });

  it('returns 422 for missing moodScore', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ energyLevel: 3 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for moodScore out of range (0)', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 0 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for moodScore out of range (6)', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 6 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for energyLevel out of range', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 3, energyLevel: 6 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for stressLevel out of range', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 3, stressLevel: 0 });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid loggedAt', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ moodScore: 3, loggedAt: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(LOGS).send({ moodScore: 3 });
    expect(res.status).toBe(401);
  });
});
