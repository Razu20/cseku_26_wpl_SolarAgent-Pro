import { Router } from 'express';
import { z } from 'zod';
import { createSurvey, deleteSurvey, getSurvey, listSurveys, updateSurvey } from '../store.js';

export const surveyRoutes = Router();

const surveySchema = z.object({
  siteId: z.string().min(1),
  technician: z.string().min(1),
  status: z.enum(['draft', 'offline', 'synced', 'approved']).default('draft'),
  notes: z.string().optional(),
});

surveyRoutes.get('/', (_req, res) => res.json({ surveys: listSurveys() }));

surveyRoutes.post('/', (req, res) => {
  const parsed = surveySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ survey: createSurvey(parsed.data) });
});

surveyRoutes.get('/:id', (req, res) => {
  const survey = getSurvey(req.params.id);
  return survey ? res.json({ survey }) : res.status(404).json({ error: 'survey_not_found' });
});

surveyRoutes.patch('/:id', (req, res) => {
  const parsed = surveySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const survey = updateSurvey(req.params.id, parsed.data);
  return survey ? res.json({ survey }) : res.status(404).json({ error: 'survey_not_found' });
});

surveyRoutes.delete('/:id', (req, res) => {
  return deleteSurvey(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'survey_not_found' });
});
