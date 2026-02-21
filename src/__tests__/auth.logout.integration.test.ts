import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGOUT = '/api/auth/logout';

const testUser = {
  email: 'logout-me@logout.welltrack',
  password: 'password123',
  displayName: 'Logout Tester',
};

/** Register + login and return a fresh refreshToken. */
async function getRefreshToken(): Promise<string> {
  const res = await request(app)
    .post(LOGIN)
    .send({ email: testUser.email, password: testUser.password });
  return res.body.refreshToken as string;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@logout.welltrack' } } });
  await request(app).post(REGISTER).send(testUser);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@logout.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and a message on success', async () => {
    const refreshToken = await getRefreshToken();
    const res = await request(app).post(LOGOUT).send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('removes the refresh token from the database', async () => {
    const refreshToken = await getRefreshToken();
    await request(app).post(LOGOUT).send({ refreshToken });

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    expect(stored).toBeNull();
  });

  it('is idempotent — returns 200 even if the token is already gone', async () => {
    const refreshToken = await getRefreshToken();
    await request(app).post(LOGOUT).send({ refreshToken });
    // Second logout with the same token
    const res = await request(app).post(LOGOUT).send({ refreshToken });

    expect(res.status).toBe(200);
  });

  it('only removes the specified token, not all tokens for the user', async () => {
    const token1 = await getRefreshToken();
    const token2 = await getRefreshToken();

    await request(app).post(LOGOUT).send({ refreshToken: token1 });

    const remaining = await prisma.refreshToken.findUnique({ where: { token: token2 } });
    expect(remaining).not.toBeNull();
  });

  it('returns 422 for missing refreshToken', async () => {
    const res = await request(app).post(LOGOUT).send({});
    expect(res.status).toBe(422);
  });

  it('returns 422 for empty refreshToken string', async () => {
    const res = await request(app).post(LOGOUT).send({ refreshToken: '   ' });
    expect(res.status).toBe(422);
  });
});
