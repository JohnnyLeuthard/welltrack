import express from 'express';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';

// Minimal test app with one protected route
const testApp = express();
testApp.use(express.json());
testApp.get('/protected', authMiddleware, (req, res) => {
  res.status(200).json({ user: req.user });
});

const testUser = {
  email: 'middleware@middleware.welltrack',
  password: 'password123',
};

let accessToken: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@middleware.welltrack' } } });
  await request(app).post(REGISTER).send(testUser);
  const res = await request(app).post(LOGIN).send(testUser);
  accessToken = res.body.accessToken as string;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@middleware.welltrack' } } });
  await prisma.$disconnect();
});

describe('authMiddleware', () => {
  it('calls next and attaches req.user for a valid token', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('userId');
    expect(res.body.user).toHaveProperty('email', testUser.email);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(testApp).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when header does not start with Bearer', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Token ${accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer this.is.not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for a token signed with the wrong secret', async () => {
    const jwt = await import('jsonwebtoken');
    const badToken = jwt.default.sign({ userId: 'fake', email: 'fake@test.com' }, 'wrong-secret');

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for an expired token', async () => {
    const jwt = await import('jsonwebtoken');
    const secret = process.env['JWT_SECRET']!;
    // Sign with expiresIn of -1s (already expired)
    const expiredToken = jwt.default.sign(
      { userId: 'u1', email: 'x@x.com' },
      secret,
      { expiresIn: -1 },
    );

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
