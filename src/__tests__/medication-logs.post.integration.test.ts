import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const LOGS = '/api/medication-logs';

const testUser = { email: 'user@med-logs-post.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let medId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@med-logs-post.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;

  const med = await prisma.medication.create({ data: { userId, name: 'Aspirin' } });
  medId = med.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@med-logs-post.welltrack' } } });
  await prisma.$disconnect();
});

describe('POST /api/medication-logs', () => {
  it('returns 201 with taken defaulting to true', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ medicationId: medId });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId, medicationId: medId, taken: true, takenAt: null, notes: null });
    expect(res.body.medication).toMatchObject({ id: medId, name: 'Aspirin' });
  });

  it('returns 201 with taken=false', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ medicationId: medId, taken: false });

    expect(res.status).toBe(201);
    expect(res.body.taken).toBe(false);
  });

  it('accepts takenAt and notes', async () => {
    const takenAt = '2024-06-15T08:00:00Z';
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ medicationId: medId, takenAt, notes: 'with food' });

    expect(res.status).toBe(201);
    expect(new Date(res.body.takenAt).toISOString()).toBe(new Date(takenAt).toISOString());
    expect(res.body.notes).toBe('with food');
  });

  it('returns 404 for a non-existent medicationId', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ medicationId: 'doesnotexist' });
    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's medication", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@med-logs-post.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherMed = await prisma.medication.create({ data: { userId: otherId, name: 'Other' } });

    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ medicationId: otherMed.id });
    expect(res.status).toBe(404);
  });

  it('returns 422 for missing medicationId', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taken: true });
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid takenAt', async () => {
    const res = await request(app)
      .post(LOGS)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ medicationId: medId, takenAt: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(LOGS).send({ medicationId: medId });
    expect(res.status).toBe(401);
  });
});
