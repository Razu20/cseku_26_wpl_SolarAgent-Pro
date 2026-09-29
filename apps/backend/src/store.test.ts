import { describe, expect, it } from 'vitest';
import { createLead, getLead, listLeads, updateLead, deleteLead, createSite, getSite, listSites, updateSite, deleteSite } from './store.js';

describe('domain CRUD', () => {
  it('creates, reads, updates, and deletes leads', () => {
    const created = createLead({ name: 'Rahim', phone: '01700000000', source: 'web', location: 'Dhaka' });
    const fetched = getLead(created.id);
    const updated = updateLead(created.id, { name: 'Rahim Uddin', phone: '01700000001' });
    const listed = listLeads();
    const removed = deleteLead(created.id);

    expect(fetched?.name).toBe('Rahim');
    expect(updated?.name).toBe('Rahim Uddin');
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(removed).toBeTruthy();
  });

  it('creates, reads, updates, and deletes sites', () => {
    const created = createSite({ name: 'House 1', address: 'Sylhet', city: 'Sylhet', utility: 'DESCO' });
    const fetched = getSite(created.id);
    const updated = updateSite(created.id, { city: 'Chattogram' });
    const listed = listSites();
    const removed = deleteSite(created.id);

    expect(fetched?.address).toBe('Sylhet');
    expect(updated?.city).toBe('Chattogram');
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(removed).toBeTruthy();
  });
});
