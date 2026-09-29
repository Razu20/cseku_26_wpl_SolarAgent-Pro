import { describe, expect, it } from 'vitest';
import {
  createContact,
  getContact,
  updateContact,
  deleteContact,
  createOpportunity,
  getOpportunity,
  updateOpportunity,
  deleteOpportunity,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  createQuote,
  getQuote,
  updateQuote,
  deleteQuote,
  createSurvey,
  getSurvey,
  updateSurvey,
  deleteSurvey,
} from './store.js';

describe('next five section CRUD operations', () => {
  it('supports contact CRUD', () => {
    const created = createContact({ leadId: 'lead-1', fullName: 'Sadia', phone: '01711111111' });
    const fetched = getContact(created.id);
    const updated = updateContact(created.id, { fullName: 'Sadia Hasan' });
    const removed = deleteContact(created.id);

    expect(fetched?.fullName).toBe('Sadia');
    expect(updated?.fullName).toBe('Sadia Hasan');
    expect(removed).toBe(true);
  });

  it('supports opportunity CRUD', () => {
    const created = createOpportunity({ leadId: 'lead-1', stage: 'qualified', amount: 350000 });
    const fetched = getOpportunity(created.id);
    const updated = updateOpportunity(created.id, { stage: 'proposal' });
    const removed = deleteOpportunity(created.id);

    expect(fetched?.amount).toBe(350000);
    expect(updated?.stage).toBe('proposal');
    expect(removed).toBe(true);
  });

  it('supports product CRUD', () => {
    const created = createProduct({ sku: 'PV-5KW', name: '5kW Solar Kit', category: 'solar', status: 'approved', price: 550000 });
    const fetched = getProduct(created.id);
    const updated = updateProduct(created.id, { price: 520000 });
    const removed = deleteProduct(created.id);

    expect(fetched?.sku).toBe('PV-5KW');
    expect(updated?.price).toBe(520000);
    expect(removed).toBe(true);
  });

  it('supports quote CRUD', () => {
    const created = createQuote({ projectId: 'project-1', total: 750000, marginPercent: 18, validityDays: 30, status: 'draft' });
    const fetched = getQuote(created.id);
    const updated = updateQuote(created.id, { status: 'approved' });
    const removed = deleteQuote(created.id);

    expect(fetched?.total).toBe(750000);
    expect(updated?.status).toBe('approved');
    expect(removed).toBe(true);
  });

  it('supports survey CRUD', () => {
    const created = createSurvey({ siteId: 'site-1', technician: 'Engineer A', status: 'offline', notes: 'Roof inspection pending' });
    const fetched = getSurvey(created.id);
    const updated = updateSurvey(created.id, { status: 'synced' });
    const removed = deleteSurvey(created.id);

    expect(fetched?.technician).toBe('Engineer A');
    expect(updated?.status).toBe('synced');
    expect(removed).toBe(true);
  });
});
