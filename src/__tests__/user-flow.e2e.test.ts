/**
 * End-to-end user flow test
 *
 * Covers the full journey described in Phase 4:
 *   register → log symptom → view in history → view in trends → export CSV → delete account
 *
 * All steps run sequentially against the real database using supertest.
 * Email domain: @user-flow-e2e.welltrack
 */

import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

const EMAIL = 'alice@user-flow-e2e.welltrack';
const PASSWORD = 'password123';
const DISPLAY_NAME = 'Alice';

afterAll(async () => {
  // Clean up in case the delete-account step didn't run (e.g., a mid-test failure)
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

describe('Full user flow: register → log → history → trends → export → delete', () => {
  // Shared state threaded through each step
  let accessToken: string;
  let userId: string;
  let symptomId: string;
  let symptomLogId: string;

  // -------------------------------------------------------------------------
  // Step 1: Register
  // -------------------------------------------------------------------------
  it('1. registers a new account', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: EMAIL,
      password: PASSWORD,
      displayName: DISPLAY_NAME,
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.user.displayName).toBe(DISPLAY_NAME);
    expect(typeof res.body.accessToken).toBe('string');

    accessToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  // -------------------------------------------------------------------------
  // Step 2: Log a symptom
  // -------------------------------------------------------------------------
  it('2. creates a custom symptom', async () => {
    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Headache', category: 'Neurological' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('E2E Headache');

    symptomId = res.body.id;
  });

  it('3. logs a symptom entry', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        symptomId,
        severity: 6,
        notes: 'E2E test entry',
        loggedAt: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.severity).toBe(6);
    expect(res.body.notes).toBe('E2E test entry');

    symptomLogId = res.body.id;
  });

  // -------------------------------------------------------------------------
  // Step 3: View in history
  // -------------------------------------------------------------------------
  it('4. retrieves the symptom log in history (GET symptom-logs)', async () => {
    const res = await request(app)
      .get('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const entry = (res.body as { id: string }[]).find((l) => l.id === symptomLogId);
    expect(entry).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Step 4: View in trends
  // -------------------------------------------------------------------------
  it('5. retrieves trends data for the symptom', async () => {
    const res = await request(app)
      .get(`/api/insights/trends?type=${symptomId}&days=7`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The log we just created should appear in the 7-day window
    const total = (res.body as { avg: number }[]).reduce((sum, d) => sum + d.avg, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('6. retrieves activity data for the calendar heatmap', async () => {
    const res = await request(app)
      .get('/api/insights/activity?days=7')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const total = (res.body as { count: number }[]).reduce((sum, d) => sum + d.count, 0);
    expect(total).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Step 5: Export CSV
  // -------------------------------------------------------------------------
  it('7. exports a CSV containing the logged data', async () => {
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    // The CSV body should contain the symptom log note
    expect(res.text).toContain('E2E test entry');
  });

  // -------------------------------------------------------------------------
  // Step 6: Delete account
  // -------------------------------------------------------------------------
  it('8. deletes the account and cascades all data', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('9. confirms the user no longer exists in the database', async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeNull();
  });

  it('10. confirms the access token is rejected after deletion', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    // The token is still structurally valid but the user is gone — authMiddleware
    // verifies the JWT signature but the controller calls findUnique which returns
    // null, resulting in a 404 (user not found) or 401 depending on implementation.
    expect([401, 404]).toContain(res.status);
  });
});
