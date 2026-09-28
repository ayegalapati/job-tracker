const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepository } = require('../src/repository');

let app;
beforeEach(() => {
  app = createApp(createMemoryRepository());
});

const create = (body = {}) =>
  request(app).post('/api/applications').send({ company: 'Benda Infotech', role: 'Software Engineer', ...body });

describe('Applications API', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('POST creates an application (201) with default status', async () => {
    const res = await create({ location: 'Remote' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, company: 'Benda Infotech', status: 'applied', location: 'Remote' });
  });

  test('POST with invalid data returns 400 and field details', async () => {
    const res = await request(app).post('/api/applications').send({ role: 'Engineer', status: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('company');
    expect(res.body.details).toHaveProperty('status');
  });

  test('POST with malformed JSON returns 400', async () => {
    const res = await request(app).post('/api/applications').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });

  test('GET list supports filtering by status', async () => {
    await create({ status: 'applied' });
    await create({ company: 'Other Co', status: 'offer' });
    const all = await request(app).get('/api/applications');
    const offers = await request(app).get('/api/applications?status=offer');
    expect(all.body).toHaveLength(2);
    expect(offers.body).toHaveLength(1);
    expect(offers.body[0].company).toBe('Other Co');
  });

  test('GET list rejects an invalid status filter', async () => {
    const res = await request(app).get('/api/applications?status=bogus');
    expect(res.status).toBe(400);
  });

  test('GET by id returns 404 when missing and 400 for bad ids', async () => {
    expect((await request(app).get('/api/applications/99')).status).toBe(404);
    expect((await request(app).get('/api/applications/abc')).status).toBe(400);
  });

  test('PATCH updates only supplied fields', async () => {
    await create({ notes: 'Referred by a friend' });
    const res = await request(app).patch('/api/applications/1').send({ status: 'interview' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'interview', notes: 'Referred by a friend' });
  });

  test('PATCH with invalid status returns 400; unknown id returns 404', async () => {
    await create();
    expect((await request(app).patch('/api/applications/1').send({ status: 'x' })).status).toBe(400);
    expect((await request(app).patch('/api/applications/42').send({ status: 'offer' })).status).toBe(404);
  });

  test('DELETE removes the application', async () => {
    await create();
    expect((await request(app).delete('/api/applications/1')).status).toBe(204);
    expect((await request(app).get('/api/applications/1')).status).toBe(404);
    expect((await request(app).delete('/api/applications/1')).status).toBe(404);
  });

  test('GET /api/stats counts applications per status', async () => {
    await create({ status: 'applied' });
    await create({ status: 'applied' });
    await create({ status: 'offer' });
    const res = await request(app).get('/api/stats');
    expect(res.body).toEqual({ wishlist: 0, applied: 2, interview: 0, offer: 1, rejected: 0 });
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
