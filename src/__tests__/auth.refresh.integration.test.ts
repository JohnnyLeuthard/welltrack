import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const REFRESH = '/api/auth/refresh';

const testUser = {
  email: 'refresh-test@refresh.welltrack',
  password: 'password123',
  displayName: 'Refresh Tester',
};

beforeAll(async () => {
  // Deleting users cascades to refresh_tokens via FK
  await prisma.user.deleteMany({ where: { email: { endsWith: '@refresh.welltrack' } } });
  await request(app).post(REGISTER).send(testUser);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@refresh.welltrack' } } });
  await prisma.$disconnect();
});

async function getRefreshToken(): Promise<{ refreshToken: string; userId: string }> {
  const res = await request(app).post(REGISTER).send({
    email: `user-${Date.now()}@refresh.welltrack`,
    password: 'password123',
  });
  return { refreshToken: res.body.refreshToken, userId: res.body.user.id };
}

describe('POST /api/auth/refresh', () => {
  it('returns 200 with a new accessToken and refreshToken', async () => {
    const { refreshToken } = await getRefreshToken();

    const res = await request(app).post(REFRESH).send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('issues a different refreshToken each time (token rotation)', async () => {
    const { refreshToken: original } = await getRefreshToken();

    const res = await request(app).post(REFRESH).send({ refreshToken: original });

    expect(res.body.refreshToken).not.toBe(original);
  });

  it('deletes the old refresh token from the database', async () => {
    const { refreshToken: original } = await getRefreshToken();

    await request(app).post(REFRESH).send({ refreshToken: original });

    const stored = await prisma.refreshToken.findUnique({ where: { token: original } });
    expect(stored).toBeNull();
  });

  it('stores the new refresh token in the database', async () => {
    const { refreshToken: original } = await getRefreshToken();

    const res = await request(app).post(REFRESH).send({ refreshToken: original });
    const newToken = res.body.refreshToken;

    const stored = await prisma.refreshToken.findUnique({ where: { token: newToken } });
    expect(stored).not.toBeNull();
  });

  it('returns 401 when the old token is reused after rotation', async () => {
    const { refreshToken: original } = await getRefreshToken();

    await request(app).post(REFRESH).send({ refreshToken: original });

    // Reuse the already-rotated token
    const res = await request(app).post(REFRESH).send({ refreshToken: original });
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token with a valid signature but not in the DB', async () => {
    // Get a token then wipe it directly from the DB
    const { refreshToken, userId } = await getRefreshToken();
    await prisma.refreshToken.deleteMany({ where: { userId } });

    const res = await request(app).post(REFRESH).send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('returns 401 for a completely invalid token string', async () => {
    const res = await request(app).post(REFRESH).send({ refreshToken: 'not.a.jwt' });
    expect(res.status).toBe(401);
  });

  it('returns 422 when refreshToken is missing', async () => {
    const res = await request(app).post(REFRESH).send({});
    expect(res.status).toBe(422);
  });

  it('returns 422 when refreshToken is not a string', async () => {
    const res = await request(app).post(REFRESH).send({ refreshToken: 123 });
    expect(res.status).toBe(422);
  });
});
