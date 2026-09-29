import { Router } from 'express';
import { z } from 'zod';
import { createProject, deleteProject, getProject, listProjects, updateProject } from '../store.js';

export const projectRoutes = Router();
const projectSchema = z.object({ leadId: z.string().min(1), siteId: z.string().min(1), quoteId: z.string().optional(), status: z.string().default('design') });
projectRoutes.get('/', (_req, res) => res.json({ projects: listProjects() }));
projectRoutes.post('/', (req, res) => { const parsed = projectSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() }); return res.status(201).json({ project: createProject(parsed.data) }); });
projectRoutes.get('/:id', (req, res) => { const project = getProject(req.params.id); return project ? res.json({ project }) : res.status(404).json({ error: 'project_not_found' }); });
projectRoutes.patch('/:id', (req, res) => { const parsed = projectSchema.partial().safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() }); const project = updateProject(req.params.id, parsed.data); return project ? res.json({ project }) : res.status(404).json({ error: 'project_not_found' }); });
projectRoutes.delete('/:id', (req, res) => deleteProject(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'project_not_found' }));
