import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/v1/[...path]/route';
import { releaseStockForOrder } from '../src/routes/inventory';
import { pool } from '../src/db/client';

// Explicit live smoke check: creates disposable customers and an order, then
// removes only rows belonging to this run, even if an assertion fails.
const runId = randomUUID();
const emails = [`qa-${runId}@example.com`, `qa-other-${runId}@example.com`];
const password = `Qa-${randomUUID()}!`;
const origin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : 'http://localhost:3000';
const userIds: string[] = [];
const orderIds: string[] = [];
const requestIds: string[] = [];
let checks = 0;
async function call(path: string, body?: unknown, token?: string, expected = 200) {
  const request = new NextRequest(`${origin}/api/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const response = await (body === undefined ? GET(request) : POST(request));
  const data = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}
try {
  await call('/orders', undefined, undefined, 401);
  await call('/admin/users', undefined, undefined, 401);
  const profile = { password, confirmPassword: password, fullName: 'Disposable QA Customer', contactNumber: '+8801700000000', division: 'Dhaka', district: 'Dhaka', upazila: 'Gulshan', village: 'QA' };
  const customers = [];
  for (const email of emails) {
    const result = await call('/auth/signup', { ...profile, email }, undefined, 201);
    userIds.push(result.user.id);
    customers.push(result);
  }
  const [customer, other] = customers;
  await call('/auth/signup', { ...profile, email: emails[0].toUpperCase() }, undefined, 409);
  await call('/auth/login', { email: emails[0].toUpperCase(), password, role: 'customer' });
  await call('/auth/login', { email: emails[0], password: 'wrong-password', role: 'customer' }, undefined, 401);
  await call('/auth/me', undefined, customer.token);
  await call('/admin/users', undefined, customer.token, 403);
  const { appliances } = await call('/appliances');
  assert.ok(appliances.length);
  const { products } = await call('/products');
  assert.ok(products.length);
  await call('/categories');
  await call('/companies');
  await call('/packages');
  const configuration = { type: 'solar', location: { division: 'Dhaka', district: 'Dhaka', upazila: 'Gulshan', village: 'QA' }, configuration: { system: 'on-grid', rooftopAreaSqFt: 1000 }, appliances: [{ applianceId: appliances[0].id, quantity: 1, dailyHours: 4 }] };
  const { estimate } = await call('/renewable/estimate', configuration);
  assert.ok(Number.isFinite(estimate.pricing.finalTotal) && estimate.pricing.finalTotal > 0);
  const result = await call('/renewable/requests', { ...configuration, userId: other.user.id, customerName: profile.fullName, contactNumber: profile.contactNumber, email: emails[0], paymentMethod: 'cod' }, customer.token, 201);
  orderIds.push(result.order.id);
  requestIds.push(result.request.id);
  assert.equal(result.order.userId, customer.user.id);
  await call(`/orders/${result.order.id}`, undefined, other.token, 403);
  await call(`/orders/${result.order.id}/cancel`, { reason: 'Unauthorized attempt' }, other.token, 403);
  await call(`/orders/track/${result.order.orderNumber}`, undefined, customer.token);
  const ownOrders = await call(`/orders?userId=${other.user.id}`, undefined, customer.token);
  assert.ok(ownOrders.orders.every((order: any) => order.userId === customer.user.id));
  await call('/payments/cod/confirm', { orderId: result.order.id }, customer.token);
  await call('/payments/cod/confirm', { orderId: result.order.id }, other.token, 403);
  await call('/notifications', undefined, customer.token);
  await call('/notifications/mark-all-read', {}, customer.token);
  await call('/chat/ticket', { orderId: result.order.id, title: 'QA ticket', description: 'Disposable smoke test ticket' }, other.token, 403);
  await call(`/orders/${result.order.id}/cancel`, { reason: 'Disposable smoke test' }, customer.token);
  if (!process.env.RESEND_API_KEY) await call('/auth/forgot-password', { email: emails[0] }, undefined, 503);
  const resetToken = randomBytes(32).toString('hex');
  await pool.query('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [createHash('sha256').update(resetToken).digest('hex'), customer.user.id, new Date(Date.now() + 60_000)]);
  await call('/auth/reset-password', { token: resetToken, newPassword: `${password}-new` });
  await call('/auth/reset-password', { token: resetToken, newPassword: `${password}-other` }, undefined, 401);
  await call('/auth/me', undefined, customer.token, 401);
  await call('/auth/login', { email: emails[0], password: `${password}-new`, role: 'customer' });
  console.log(`PASS: ${checks} live API checks (signup, login, catalog, estimates, orders, tracking, COD, cancellation, ownership, notifications, recovery protection).`);
} finally {
  // Strictly scoped to the disposable records created by this invocation.
  for (const id of orderIds) {
    await releaseStockForOrder(id);
    await pool.query('DELETE FROM stock_movements WHERE reference_id = $1', [id]);
    await pool.query('DELETE FROM payments WHERE order_id = $1', [id]);
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);
  }
  for (const id of requestIds) {
    await pool.query('DELETE FROM project_request_appliances WHERE project_request_id = $1', [id]);
    await pool.query('DELETE FROM project_requests WHERE id = $1', [id]);
  }
  for (const id of userIds) {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
  // Remove administrator notifications referring to this run's order numbers.
  for (const id of orderIds) await pool.query('DELETE FROM notifications WHERE title LIKE $1', [`%${id.toUpperCase()}%`]);
  await pool.end();
}
