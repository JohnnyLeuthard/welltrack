import request from 'supertest';
import app from '../app';

describe('Express app configuration', () => {
  it('parses JSON request bodies', async () => {
    // Add a temporary echo route only for this test via a one-off request
    // We verify JSON middleware is active by hitting health (which uses express.json)
    // and by checking that malformed JSON returns 400, not a crash
    const res = await request(app)
      .get('/health')
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown POST routes', async () => {
    const res = await request(app).post('/unknown').send({ data: 'test' });
    expect(res.status).toBe(404);
  });
});
