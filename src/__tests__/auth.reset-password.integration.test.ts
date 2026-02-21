import { createHash, randomBytes } from 'crypto';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const RESET = '/api/auth/reset-password';

const testUser = {
  email: 'reset-pw@reset.welltrack',
  password: 'OldPassword1!',
  displayName: 'Reset Tester',
};

let userId: string;

/**
 * Insert a PasswordResetToken directly and return the raw token.
 * This avoids relying on the email stub and lets us control expiry/used state.
 */
async function createResetToken(opts: { expiresInMs?: number; used?: boolean } = {}): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + (opts.expiresInMs ?? 60 * 60 * 1000));

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
      used: opts.used ?? false,
    },
  });

  return rawToken;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@reset.welltrack' } } });
  const res = await request(app).post(REGISTER).send(testUser);
  userId = res.body.user.id as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@reset.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/reset-password', () => {
  it('returns 200 and resets the password with a valid token', async () => {
    const token = await createResetToken();
    const res = await request(app).post(RESET).send({ token, password: 'NewPassword1!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('allows login with the new password after reset', async () => {
    const token = await createResetToken();
    await request(app).post(RESET).send({ token, password: 'BrandNewPass1!' });

    const loginRes = await request(app)
      .post(LOGIN)
      .send({ email: testUser.email, password: 'BrandNewPass1!' });

    expect(loginRes.status).toBe(200);

    // Restore original password for subsequent tests
    const restoreToken = await createResetToken();
    await request(app).post(RESET).send({ token: restoreToken, password: testUser.password });
  });

  it('marks the token as used after a successful reset', async () => {
    const token = await createResetToken();
    const hashed = createHash('sha256').update(token).digest('hex');

    await request(app).post(RESET).send({ token, password: 'AnotherPass1!' });

    const record = await prisma.passwordResetToken.findUnique({ where: { token: hashed } });
    expect(record?.used).toBe(true);

    // Restore
    const restore = await createResetToken();
    await request(app).post(RESET).send({ token: restore, password: testUser.password });
  });

  it('invalidates all refresh tokens (forces re-login) after reset', async () => {
    // Log in to get a refresh token
    const loginRes = await request(app)
      .post(LOGIN)
      .send({ email: testUser.email, password: testUser.password });
    const { refreshToken } = loginRes.body as { refreshToken: string };

    const token = await createResetToken();
    await request(app).post(RESET).send({ token, password: 'ForceLogout1!' });

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    expect(stored).toBeNull();

    // Restore
    const restore = await createResetToken();
    await request(app).post(RESET).send({ token: restore, password: testUser.password });
  });

  it('returns 400 for an already-used token', async () => {
    const token = await createResetToken({ used: true });
    const res = await request(app).post(RESET).send({ token, password: 'SomePass123!' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for an expired token', async () => {
    const token = await createResetToken({ expiresInMs: -1000 }); // already expired
    const res = await request(app).post(RESET).send({ token, password: 'SomePass123!' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a completely fake token', async () => {
    const res = await request(app)
      .post(RESET)
      .send({ token: 'notarealtokenthatexistsinthedatabase', password: 'SomePass123!' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 422 for missing token', async () => {
    const res = await request(app).post(RESET).send({ password: 'SomePass123!' });
    expect(res.status).toBe(422);
  });

  it('returns 422 for password shorter than 8 characters', async () => {
    const token = await createResetToken();
    const res = await request(app).post(RESET).send({ token, password: 'short' });
    expect(res.status).toBe(422);
  });
});
