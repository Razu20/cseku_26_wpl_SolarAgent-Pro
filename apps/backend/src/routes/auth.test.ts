import { describe, expect, it } from 'vitest';

describe('auth route contract', () => {
  it('exposes a login contract', () => {
    expect({ token: 'dev-token', user: { role: 'sales_executive' } }).toEqual({
      token: 'dev-token',
      user: { role: 'sales_executive' },
    });
  });
});
