import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Router, createResponse, type Request } from './router';
const request = (): Request => ({ method: 'GET', body: {}, params: {}, query: {}, headers: {} });
it('awaits async routes after middleware calls next without returning it', async () => {
  const router = new Router();
  router.use('/private', (_req, _res, next) => { next(); });
  router.get('/private', async (_req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    res.json({ ok: true });
  });
  const res = createResponse();
  assert.ok(await router.dispatch(request(), res, '/private'));
  assert.deepEqual(await res.response?.json(), { ok: true });
});
it('stops at rejected authorization middleware', async () => {
  const router = new Router();
  router.use('/private', (_req, res) => res.status(401).json({ error: 'unauthorized' }));
  router.get('/private', () => { throw new Error('must not reach protected handler'); });
  const res = createResponse();
  await router.dispatch(request(), res, '/private');
  assert.equal(res.response?.status, 401);
});
it('returns redirects with a valid redirect status and strips server errors', async () => {
  const res = createResponse();
  res.redirect('http://localhost:3000/customer');
  assert.equal(res.response?.status, 303);
  const error = createResponse();
  error.status(500).json({ error: 'SQL password=secret' });
  assert.equal((await error.response!.json()).error, 'internal_server_error');
});
