import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const BASE = '/api/auth/register';

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up any users created during tests
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.welltrack' } } });
});

describe('POST /api/auth/register', () => {
  const validBody = {
    email: 'alice@test.welltrack',
    password: 'password123',
    displayName: 'Alice',
  };

  it('returns 201 with user, accessToken, and refreshToken on success', async () => {
    const res = await request(app).post(BASE).send(validBody);

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.user).toMatchObject({
      email: 'alice@test.welltrack',
      displayName: 'Alice',
    });
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('stores the refresh token in the database', async () => {
    const res = await request(app).post(BASE).send(validBody);

    const stored = await prisma.refreshToken.findFirst({
      where: { token: res.body.refreshToken },
    });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(res.body.user.id);
  });

  it('normalises email to lowercase', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ ...validBody, email: 'Alice@Test.WellTrack' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.welltrack');
  });

  it('works without displayName', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ email: 'bob@test.welltrack', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.displayName).toBeNull();
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post(BASE).send(validBody);
    const res = await request(app).post(BASE).send(validBody);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 422 for missing email', async () => {
    const res = await request(app).post(BASE).send({ password: 'password123' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for password shorter than 8 characters', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ email: 'carol@test.welltrack', password: 'short' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for non-string displayName', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ email: 'dave@test.welltrack', password: 'password123', displayName: 42 });
    expect(res.status).toBe(422);
  });
});
