import { it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from '../../app/api/v1/[...path]/route';
import { apiRouter } from '../api';
import type { Router } from '../lib/router';
it('rejects unauthenticated operations across database and legacy routers', async () => {
  const paths: Array<{ path: string; verb: string }> = [];
  const collect = (router: Router, prefix = '') => {
    for (const layer of router.layers) {
      const path = `${prefix}${layer.path === '/' ? '' : layer.path}` || '/';
      if (layer.router) collect(layer.router, path === '/' ? '' : path);
      else if (layer.method) paths.push({ path, verb: layer.method });
    }
  };
  collect(apiRouter);
  let checked = 0;
  for (const route of paths) {
    const { verb } = route;
    if (/^\/auth\/(login|signup|forgot-password|reset-password)$/.test(route.path)) continue;
    if (route.path.startsWith('/payments/sslcommerz/') && !route.path.endsWith('/init')) continue;
    if (route.path === '/chat') continue;
    if (verb === 'POST' && /^\/(renewable\/)?estimate$/.test(route.path)) continue;
    if (verb === 'GET' && /^\/(renewable\/)?(products|appliances|companies|categories|packages|weather|suppliers)(\/[^/]+)?$/.test(route.path)) continue;
    const path = route.path.replace(/:[^/]+/g, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const method = verb === 'GET' ? GET : verb === 'PATCH' ? PATCH : POST;
    const response = await method(new NextRequest(`http://localhost:3000/api/v1${path}`, { method: verb, ...(verb === 'GET' ? {} : { body: '{}', headers: { 'content-type': 'application/json' } }) }));
    assert.equal(response.status, 401, `${verb} ${path}`);
    checked++;
  }
  assert.ok(checked >= 100, `Expected full route coverage, got ${checked}`);
});
it('rejects malformed JSON, oversized payloads and cross-origin mutations', async () => {
  const malformed = await POST(new NextRequest('http://localhost:3000/api/v1/auth/login', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } }));
  assert.equal(malformed.status, 400);
  const oversized = await POST(new NextRequest('http://localhost:3000/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(262144) }), headers: { 'content-type': 'application/json' } }));
  assert.equal(oversized.status, 413);
  const crossOrigin = await POST(new NextRequest('http://localhost:3000/api/v1/auth/login', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', origin: 'https://attacker.example' } }));
  assert.equal(crossOrigin.status, 403);
});
