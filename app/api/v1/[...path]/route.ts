import { NextRequest } from 'next/server';
import { apiRouter } from '../../../../src/api';
import { createRequest, createResponse } from '../../../../src/lib/router';
import { allowRequest } from '../../../../src/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 256 * 1024;
async function readBody(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('payload_too_large');
    }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  const type = request.headers.get('content-type')?.split(';')[0];
  if (type === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(text));
  if (type !== 'application/json') throw new Error('unsupported_media_type');
  try {
    const body = JSON.parse(text);
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch { throw new Error('invalid_json'); }
}
async function handler(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/^\/api\/v1/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS' } });
  if (request.method === 'HEAD') return new Response(null, { status: 405 });
  // Callback requests originate at the provider; they are verified server-side.
  const callback = /^\/payments\/sslcommerz\/(success|fail|cancel|ipn)$/.test(pathname);
  const origin = request.headers.get('origin');
  const expectedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : request.nextUrl.origin;
  if (!callback && !['GET', 'HEAD'].includes(request.method) && origin && origin !== expectedOrigin) {
    return Response.json({ error: 'origin_not_allowed' }, { status: 403 });
  }
  if (/^\/auth\/(login|signup|forgot-password|reset-password)$/.test(pathname)) {
    if (!allowRequest('auth:global', 120)) return Response.json({ error: 'too_many_requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  } else if (pathname === '/chat' || pathname.endsWith('/estimate')) {
    if (!allowRequest(`costly:${pathname}`, 120)) return Response.json({ error: 'too_many_requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  try {
    const body = ['GET', 'HEAD'].includes(request.method) ? {} : await readBody(request);
    const req = createRequest(request, body);
    const res = createResponse();
    const found = await apiRouter.dispatch(req, res, pathname);
    if (!found) return Response.json({ error: 'route_not_found' }, { status: 404 });
    return res.response || Response.json({ error: 'internal_server_error' }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = { payload_too_large: 413, invalid_json: 400, unsupported_media_type: 415 }[message];
    if (status) return Response.json({ error: message }, { status });
    const cause = (error as { cause?: { code?: string }; code?: string });
    const code = cause?.cause?.code || cause?.code;
    console.error('API request failed', { method: request.method, pathname, code: code || 'internal_error' });
    return Response.json({ error: 'service_unavailable', message: 'The service is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
export const GET = handler;
export const HEAD = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
