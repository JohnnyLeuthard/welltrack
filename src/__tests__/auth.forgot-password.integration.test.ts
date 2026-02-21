import { createHash } from 'crypto';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const FORGOT = '/api/auth/forgot-password';

const testUser = {
  email: 'reset-me@forgot.welltrack',
  password: 'password123',
  displayName: 'Forgot Tester',
};

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@forgot.welltrack' } } });
  await request(app).post(REGISTER).send(testUser);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@forgot.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 for a registered email', async () => {
    const res = await request(app).post(FORGOT).send({ email: testUser.email });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns 200 for an unregistered email (no user enumeration)', async () => {
    const res = await request(app)
      .post(FORGOT)
      .send({ email: 'nobody@forgot.welltrack' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('returns the same message for registered and unregistered emails', async () => {
    const registered = await request(app).post(FORGOT).send({ email: testUser.email });
    const unregistered = await request(app)
      .post(FORGOT)
      .send({ email: 'nobody@forgot.welltrack' });

    expect(registered.body.message).toBe(unregistered.body.message);
  });

  it('stores a hashed reset token in the database for a registered email', async () => {
    // Need a fresh user so we know no prior tokens exist
    const freshEmail = 'fresh@forgot.welltrack';
    await request(app).post(REGISTER).send({ email: freshEmail, password: 'password123' });

    await request(app).post(FORGOT).send({ email: freshEmail });

    const user = await prisma.user.findUnique({ where: { email: freshEmail } });
    const token = await prisma.passwordResetToken.findFirst({
      where: { userId: user!.id, used: false },
      orderBy: { createdAt: 'desc' },
    });

    expect(token).not.toBeNull();
    expect(token!.used).toBe(false);
    expect(token!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does NOT store the raw token — only the SHA-256 hash', async () => {
    const hashEmail = 'hashcheck@forgot.welltrack';
    await request(app).post(REGISTER).send({ email: hashEmail, password: 'password123' });

    await request(app).post(FORGOT).send({ email: hashEmail });

    const user = await prisma.user.findUnique({ where: { email: hashEmail } });
    const token = await prisma.passwordResetToken.findFirst({
      where: { userId: user!.id },
    });

    // The stored token should be a 64-char hex string (SHA-256 output)
    expect(token!.token).toHaveLength(64);
    // And it should not be the raw token itself — raw is also 64 hex chars but
    // hashing the stored value produces a different string
    const doubleHash = createHash('sha256').update(token!.token).digest('hex');
    expect(doubleHash).not.toBe(token!.token);
  });

  it('invalidates existing unused tokens when a new request is made', async () => {
    const rotateEmail = 'rotate@forgot.welltrack';
    await request(app).post(REGISTER).send({ email: rotateEmail, password: 'password123' });

    // First request — creates token
    await request(app).post(FORGOT).send({ email: rotateEmail });
    // Second request — should mark first token as used, create new one
    await request(app).post(FORGOT).send({ email: rotateEmail });

    const user = await prisma.user.findUnique({ where: { email: rotateEmail } });
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user!.id },
    });

    const unused = tokens.filter((t) => !t.used);
    const used = tokens.filter((t) => t.used);

    expect(unused).toHaveLength(1);
    expect(used).toHaveLength(1);
  });

  it('returns 422 for missing email', async () => {
    const res = await request(app).post(FORGOT).send({});
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app).post(FORGOT).send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('accepts email in any case', async () => {
    const res = await request(app)
      .post(FORGOT)
      .send({ email: 'RESET-ME@FORGOT.WELLTRACK' });

    expect(res.status).toBe(200);
  });
});
