import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const ME = '/api/users/me';

const testUser = {
  email: 'me@get-me.welltrack',
  password: 'password123',
  displayName: 'Get Me Tester',
};

let accessToken: string;
let userId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@get-me.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@get-me.welltrack' } } });
  await prisma.$disconnect();
});

describe('GET /api/users/me', () => {
  it('returns 200 with the user profile for a valid token', async () => {
    const res = await request(app).get(ME).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toMatchObject({
      id: userId,
      email: testUser.email,
      displayName: testUser.displayName,
      timezone: 'UTC',
    });
    expect(res.body).toHaveProperty('createdAt');
  });

  it('does not expose passwordHash', async () => {
    const res = await request(app).get(ME).set('Authorization', `Bearer ${accessToken}`);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(ME);
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app).get(ME).set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});
