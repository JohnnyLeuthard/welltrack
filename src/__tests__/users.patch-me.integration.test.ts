import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const ME = '/api/users/me';

const testUser = {
  email: 'me@patch-me.welltrack',
  password: 'password123',
  displayName: 'Original Name',
};

let accessToken: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@patch-me.welltrack' } } });
  await request(app).post(REGISTER).send(testUser);
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@patch-me.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/users/me', () => {
  it('updates displayName and returns the updated profile', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Updated Name');
    expect(res.body.email).toBe(testUser.email);
  });

  it('updates timezone to a valid IANA string', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('America/New_York');
  });

  it('updates both displayName and timezone in one request', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Both Updated', timezone: 'Europe/London' });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Both Updated');
    expect(res.body.timezone).toBe('Europe/London');
  });

  it('accepts null to clear displayName', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: null });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBeNull();
  });

  it('is a no-op when body is empty (returns current profile)', async () => {
    const before = await request(app).get(ME).set('Authorization', `Bearer ${accessToken}`);
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(before.body.email);
  });

  it('returns 422 for an invalid IANA timezone', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: 'Not/A/Timezone' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 422 for a non-string timezone', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: 42 });

    expect(res.status).toBe(422);
  });

  it('returns 422 for a non-string displayName (when not null)', async () => {
    const res = await request(app)
      .patch(ME)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 99 });

    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(ME).send({ displayName: 'Hacker' });
    expect(res.status).toBe(401);
  });
});
