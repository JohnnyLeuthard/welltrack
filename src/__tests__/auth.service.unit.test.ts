/**
 * Auth service — unit-level behaviour tests
 *
 * These tests exercise the internal behaviour of the auth service (password
 * hashing, token generation, token validation) using the real database and
 * real JWT/bcrypt libraries — consistent with the project's no-mock policy.
 *
 * Email domain: @auth-service-unit.welltrack
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const ME = '/api/users/me';

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@auth-service-unit.welltrack' } },
  });
});

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

describe('Auth service — password hashing', () => {
  it('stores a bcrypt hash, not the plaintext password', async () => {
    const password = 'password123';
    await request(app)
      .post(REGISTER)
      .send({ email: 'alice@auth-service-unit.welltrack', password });

    const user = await prisma.user.findUnique({
      where: { email: 'alice@auth-service-unit.welltrack' },
      select: { passwordHash: true },
    });

    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe(password);
    // bcrypt hashes always start with $2a$ or $2b$
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  it('stored hash verifies against the correct password', async () => {
    const password = 'password123';
    await request(app)
      .post(REGISTER)
      .send({ email: 'bob@auth-service-unit.welltrack', password });

    const user = await prisma.user.findUnique({
      where: { email: 'bob@auth-service-unit.welltrack' },
      select: { passwordHash: true },
    });

    await expect(bcrypt.compare(password, user!.passwordHash)).resolves.toBe(true);
  });

  it('stored hash rejects a wrong password', async () => {
    const password = 'password123';
    await request(app)
      .post(REGISTER)
      .send({ email: 'carol@auth-service-unit.welltrack', password });

    const user = await prisma.user.findUnique({
      where: { email: 'carol@auth-service-unit.welltrack' },
      select: { passwordHash: true },
    });

    await expect(bcrypt.compare('wrongpassword', user!.passwordHash)).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Access token generation
// ---------------------------------------------------------------------------

describe('Auth service — access token generation', () => {
  it('access token is a valid JWT signed with JWT_SECRET', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'dave@auth-service-unit.welltrack', password: 'password123' });

    const secret = process.env['JWT_SECRET']!;
    expect(() => jwt.verify(res.body.accessToken, secret)).not.toThrow();
  });

  it('access token contains userId and email claims', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'eve@auth-service-unit.welltrack', password: 'password123' });

    const payload = jwt.decode(res.body.accessToken) as {
      userId: string;
      email: string;
    };

    expect(payload.userId).toBe(res.body.user.id);
    expect(payload.email).toBe('eve@auth-service-unit.welltrack');
  });

  it('access token expires in exactly 15 minutes', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'frank@auth-service-unit.welltrack', password: 'password123' });

    const payload = jwt.decode(res.body.accessToken) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('access token grants access to protected routes', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'grace@auth-service-unit.welltrack', password: 'password123' });

    const meRes = await request(app)
      .get(ME)
      .set('Authorization', `Bearer ${res.body.accessToken}`);

    expect(meRes.status).toBe(200);
  });

  it('a tampered access token is rejected with 401', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'heidi@auth-service-unit.welltrack', password: 'password123' });

    // Flip the last character of the signature segment
    const token: string = res.body.accessToken;
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');

    const meRes = await request(app).get(ME).set('Authorization', `Bearer ${tampered}`);

    expect(meRes.status).toBe(401);
  });

  it('a token signed with the wrong secret is rejected with 401', async () => {
    const fakeToken = jwt.sign(
      { userId: 'fake-id', email: 'hacker@auth-service-unit.welltrack' },
      'wrong-secret',
      { expiresIn: '15m' },
    );

    const meRes = await request(app).get(ME).set('Authorization', `Bearer ${fakeToken}`);

    expect(meRes.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Refresh token generation
// ---------------------------------------------------------------------------

describe('Auth service — refresh token generation', () => {
  it('refresh token is a valid JWT signed with JWT_REFRESH_SECRET', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'ivan@auth-service-unit.welltrack', password: 'password123' });

    const secret = process.env['JWT_REFRESH_SECRET']!;
    expect(() => jwt.verify(res.body.refreshToken, secret)).not.toThrow();
  });

  it('refresh token contains userId and a jti claim', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'judy@auth-service-unit.welltrack', password: 'password123' });

    const payload = jwt.decode(res.body.refreshToken) as { userId: string; jti: string };

    expect(payload.userId).toBe(res.body.user.id);
    expect(typeof payload.jti).toBe('string');
    expect(payload.jti.length).toBeGreaterThan(0);
  });

  it('refresh token expires in exactly 7 days', async () => {
    const res = await request(app)
      .post(REGISTER)
      .send({ email: 'kent@auth-service-unit.welltrack', password: 'password123' });

    const payload = jwt.decode(res.body.refreshToken) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  it('concurrent registrations produce unique jti values', async () => {
    const [res1, res2] = await Promise.all([
      request(app)
        .post(REGISTER)
        .send({ email: 'laura@auth-service-unit.welltrack', password: 'password123' }),
      request(app)
        .post(REGISTER)
        .send({ email: 'mike@auth-service-unit.welltrack', password: 'password123' }),
    ]);

    const p1 = jwt.decode(res1.body.refreshToken) as { jti: string };
    const p2 = jwt.decode(res2.body.refreshToken) as { jti: string };

    expect(p1.jti).not.toBe(p2.jti);
  });
});
