import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from './auth';
import { hashPassword, verifyPassword } from '../lib/password';
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters';
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'test@example.com', role: 'customer' as const };
describe('authentication security', () => {
  it('validates signed tokens and rejects modified signatures', () => {
    const token = signToken(user);
    assert.equal(verifyToken(token)?.id, user.id);
    assert.equal(verifyToken(`${token.slice(0, -3)}xxx`), null);
    assert.equal(verifyToken('dev-token'), null);
  });
  it('rejects a tampered payload and malformed tokens', () => {
    const [header, , signature] = signToken(user).split('.');
    const admin = Buffer.from(JSON.stringify({ ...user, role: 'admin' })).toString('base64url');
    assert.equal(verifyToken(`${header}.${admin}.${signature}`), null);
    assert.equal(verifyToken('a.b.c'), null);
  });
  it('salts password hashes and verifies only the correct password', () => {
    const hash = hashPassword('LongExamplePassword!');
    assert.notEqual(hash, hashPassword('LongExamplePassword!'));
    assert.ok(verifyPassword('LongExamplePassword!', hash));
    assert.equal(verifyPassword('incorrect', hash), false);
    assert.equal(verifyPassword('incorrect', 'malformed'), false);
  });
});
