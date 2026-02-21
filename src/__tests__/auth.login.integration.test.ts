import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';

const testUser = {
  email: 'login-test@login.welltrack',
  password: 'password123',
  displayName: 'Login Tester',
};

beforeAll(async () => {
  // Deleting users cascades to refresh_tokens via FK
  await prisma.user.deleteMany({ where: { email: { endsWith: '@login.welltrack' } } });
  await request(app).post(REGISTER).send(testUser);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@login.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('returns 200 with user, accessToken, and refreshToken on success', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.user).toMatchObject({
      email: testUser.email,
      displayName: testUser.displayName,
    });
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('stores a new refresh token in the database on each login', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: testUser.email, password: testUser.password });

    const stored = await prisma.refreshToken.findFirst({
      where: { token: res.body.refreshToken },
    });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(res.body.user.id);
  });

  it('accepts email in any case', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'LOGIN-TEST@LOGIN.WELLTRACK', password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for unregistered email', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'nobody@login.welltrack', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns the same 401 error message for wrong password and unknown email', async () => {
    const wrongPass = await request(app)
      .post(LOGIN)
      .send({ email: testUser.email, password: 'wrong' });

    const unknownUser = await request(app)
      .post(LOGIN)
      .send({ email: 'nobody@login.welltrack', password: 'password123' });

    // Same message prevents user enumeration
    expect(wrongPass.body.error).toBe(unknownUser.body.error);
  });

  it('returns 422 for missing email', async () => {
    const res = await request(app).post(LOGIN).send({ password: 'password123' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post(LOGIN)
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for missing password', async () => {
    const res = await request(app).post(LOGIN).send({ email: testUser.email });
    expect(res.status).toBe(422);
  });
});
