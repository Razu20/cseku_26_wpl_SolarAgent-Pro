import { it } from 'node:test';
import assert from 'node:assert/strict';
import { allowRequest } from './rateLimit';
it('limits repeated requests while keeping different buckets independent', () => {
  assert.equal(allowRequest('test-one', 1), true);
  assert.equal(allowRequest('test-one', 1), false);
  assert.equal(allowRequest('test-two', 1), true);
});
