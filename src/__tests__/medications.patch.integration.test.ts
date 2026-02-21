import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const REGISTER = '/api/auth/register';
const LOGIN = '/api/auth/login';
const MEDS = '/api/medications';

const testUser = { email: 'user@medications-patch.welltrack', password: 'password123' };

let accessToken: string;
let userId: string;
let medId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-patch.welltrack' } } });
  const reg = await request(app).post(REGISTER).send(testUser);
  userId = reg.body.user.id as string;
  const login = await request(app).post(LOGIN).send(testUser);
  accessToken = login.body.accessToken as string;
});

beforeEach(async () => {
  const med = await prisma.medication.create({
    data: { userId, name: 'Aspirin', dosage: '100mg', frequency: 'daily' },
  });
  medId = med.id;
});

afterEach(async () => {
  await prisma.medication.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@medications-patch.welltrack' } } });
  await prisma.$disconnect();
});

describe('PATCH /api/medications/:id', () => {
  it('updates name', async () => {
    const res = await request(app)
      .patch(`${MEDS}/${medId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Paracetamol' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Paracetamol');
  });

  it('updates dosage and frequency', async () => {
    const res = await request(app)
      .patch(`${MEDS}/${medId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dosage: '500mg', frequency: 'twice daily' });

    expect(res.status).toBe(200);
    expect(res.body.dosage).toBe('500mg');
    expect(res.body.frequency).toBe('twice daily');
  });

  it('sets isActive to false (soft disable)', async () => {
    const res = await request(app)
      .patch(`${MEDS}/${medId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('accepts null to clear dosage', async () => {
    const res = await request(app)
      .patch(`${MEDS}/${medId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dosage: null });

    expect(res.status).toBe(200);
    expect(res.body.dosage).toBeNull();
  });

  it("returns 403 for another user's medication", async () => {
    const otherReg = await request(app)
      .post(REGISTER)
      .send({ email: 'other@medications-patch.welltrack', password: 'password123' });
    const otherId = otherReg.body.user.id as string;
    const otherMed = await prisma.medication.create({ data: { userId: otherId, name: 'Other' } });

    const res = await request(app)
      .patch(`${MEDS}/${otherMed.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .patch(`${MEDS}/nonexistentid`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 422 for empty name', async () => {
    const res = await request(app)
      .patch(`${MEDS}/${medId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch(`${MEDS}/${medId}`).send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});
