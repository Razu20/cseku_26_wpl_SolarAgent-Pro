import { describe, expect, it } from 'vitest';
import {
  createRecommendation,
  getRecommendation,
  listRecommendations,
  updateRecommendation,
  deleteRecommendation,
  createEngineeringResult,
  getEngineeringResult,
  listEngineeringResults,
  updateEngineeringResult,
  deleteEngineeringResult,
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  createTicket,
  getTicket,
  listTickets,
  updateTicket,
  deleteTicket,
} from './store.js';

describe('section CRUD operations', () => {
  it('supports recommendation-case CRUD', () => {
    const created = createRecommendation({
      customerName: 'Nabila',
      objective: 'balanced',
      summary: 'Initial solar recommendation',
      facts: [{ key: 'bill', value: '12000', status: 'user_provided', source: 'user', confidence: 0.9 }],
    });
    const fetched = getRecommendation(created.id);
    const updated = updateRecommendation(created.id, { objective: 'backup' });
    const listed = listRecommendations();
    const removed = deleteRecommendation(created.id);

    expect(fetched?.customerName).toBe('Nabila');
    expect(updated?.objective).toBe('backup');
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(removed).toBe(true);
  });

  it('supports engineering-result CRUD', () => {
    const created = createEngineeringResult({
      traceId: 'ENG-001',
      engine: 'solar_design',
      formulaVersion: '1.4.0',
      inputsHash: 'abc',
      result: { pvKwp: 5.5 },
      warnings: [],
      assumptions: ['roof area'],
    });
    const fetched = getEngineeringResult(created.id);
    const updated = updateEngineeringResult(created.id, { engine: 'hybrid_design' });
    const listed = listEngineeringResults();
    const removed = deleteEngineeringResult(created.id);

    expect(fetched?.traceId).toBe('ENG-001');
    expect(updated?.engine).toBe('hybrid_design');
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(removed).toBe(true);
  });

  it('supports project CRUD', () => {
    const created = createProject({ leadId: 'lead-1', siteId: 'site-1', quoteId: 'quote-1', status: 'design' });
    const fetched = getProject(created.id);
    const updated = updateProject(created.id, { status: 'install' });
    const listed = listProjects();
    const removed = deleteProject(created.id);

    expect(fetched?.leadId).toBe('lead-1');
    expect(updated?.status).toBe('install');
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(removed).toBe(true);
  });

  it('supports ticket CRUD', () => {
    const created = createTicket({ siteId: 'site-1', title: 'Inverter alarm', severity: 'high', description: 'Battery not charging' });
    const fetched = getTicket(created.id);
    const updated = updateTicket(created.id, { status: 'assigned' });
    const listed = listTickets();
    const removed = deleteTicket(created.id);

    expect(fetched?.title).toBe('Inverter alarm');
    expect(updated?.status).toBe('assigned');
    expect(listed.length).toBeGreaterThanOrEqual(1);
    expect(removed).toBe(true);
  });
});
