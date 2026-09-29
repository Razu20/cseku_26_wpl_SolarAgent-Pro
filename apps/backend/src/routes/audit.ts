import { Router } from 'express';

export const auditRoutes = Router();

auditRoutes.get('/:entity/:id', (req, res) => {
  res.json({
    entity: req.params.entity,
    id: req.params.id,
    history: [
      { actor: 'ai_agent', action: 'recommendation_case_created', timestamp: new Date().toISOString() },
      { actor: 'sales_executive', action: 'quote_approved', timestamp: new Date().toISOString() },
    ],
  });
});
