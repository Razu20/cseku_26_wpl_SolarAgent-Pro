import { it } from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrderStatus } from './orderLifecycle';
it('rejects invalid transitions and prevents terminal orders being reopened', () => {
  assert.equal(canTransitionOrderStatus('awaiting_payment', 'confirmed'), true);
  assert.equal(canTransitionOrderStatus('confirmed', 'completed'), false);
  for (const terminal of ['completed', 'cancelled', 'refunded']) assert.equal(canTransitionOrderStatus(terminal, 'confirmed'), false);
  assert.equal(canTransitionOrderStatus('paid', 'confirmed'), true);
});
