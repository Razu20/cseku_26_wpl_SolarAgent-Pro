import { describe, expect, it } from 'vitest';
import {
  createUtility,
  getUtility,
  updateUtility,
  deleteUtility,
  createInventoryItem,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  createWorkOrder,
  getWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  createNEMApplication,
  getNEMApplication,
  updateNEMApplication,
  deleteNEMApplication,
  createDevice,
  getDevice,
  updateDevice,
  deleteDevice,
} from './store.js';

describe('extended section CRUD operations', () => {
  it('supports utility CRUD', () => {
    const created = createUtility({ name: 'DESCO', company: 'Dhaka Electric', region: 'Dhaka', status: 'active' });
    const fetched = getUtility(created.id);
    const updated = updateUtility(created.id, { status: 'configurable' });
    const removed = deleteUtility(created.id);
    expect(fetched?.name).toBe('DESCO');
    expect(updated?.status).toBe('configurable');
    expect(removed).toBe(true);
  });

  it('supports inventory CRUD', () => {
    const created = createInventoryItem({ sku: 'INV-001', name: 'Solar inverter', category: 'inverter', quantity: 8, status: 'available', warehouse: 'Dhaka' });
    const fetched = getInventoryItem(created.id);
    const updated = updateInventoryItem(created.id, { quantity: 6 });
    const removed = deleteInventoryItem(created.id);
    expect(fetched?.sku).toBe('INV-001');
    expect(updated?.quantity).toBe(6);
    expect(removed).toBe(true);
  });

  it('supports work-order CRUD', () => {
    const created = createWorkOrder({ projectId: 'project-1', title: 'Roof mount', status: 'scheduled', technician: 'Technician X', dueDate: '2026-10-03' });
    const fetched = getWorkOrder(created.id);
    const updated = updateWorkOrder(created.id, { status: 'in_progress' });
    const removed = deleteWorkOrder(created.id);
    expect(fetched?.title).toBe('Roof mount');
    expect(updated?.status).toBe('in_progress');
    expect(removed).toBe(true);
  });

  it('supports NEM application CRUD', () => {
    const created = createNEMApplication({ siteId: 'site-1', utility: 'DESCO', status: 'submitted', applicationRef: 'NEM-1001' });
    const fetched = getNEMApplication(created.id);
    const updated = updateNEMApplication(created.id, { status: 'approved' });
    const removed = deleteNEMApplication(created.id);
    expect(fetched?.utility).toBe('DESCO');
    expect(updated?.status).toBe('approved');
    expect(removed).toBe(true);
  });

  it('supports device CRUD', () => {
    const created = createDevice({ siteId: 'site-1', type: 'inverter', status: 'online', lastSeenAt: '2026-09-27T12:00:00Z' });
    const fetched = getDevice(created.id);
    const updated = updateDevice(created.id, { status: 'warning' });
    const removed = deleteDevice(created.id);
    expect(fetched?.type).toBe('inverter');
    expect(updated?.status).toBe('warning');
    expect(removed).toBe(true);
  });
});
