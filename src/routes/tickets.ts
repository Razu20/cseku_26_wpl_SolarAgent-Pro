// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import { createTicket, deleteTicket, getTicket, listTickets, updateTicket } from '../store';

export const ticketRoutes = new Router();
const ticketSchema = z.object({ siteId: z.string().min(1), title: z.string().min(1), severity: z.enum(['low', 'medium', 'high', 'critical']), description: z.string().min(1), status: z.string().default('open') });
ticketRoutes.get('/', (_req, res) => res.json({ tickets: listTickets() }));
ticketRoutes.post('/', (req, res) => { const parsed = ticketSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() }); return res.status(201).json({ ticket: createTicket(parsed.data) }); });
ticketRoutes.get('/:id', (req, res) => { const ticket = getTicket(req.params.id); return ticket ? res.json({ ticket }) : res.status(404).json({ error: 'ticket_not_found' }); });
ticketRoutes.patch('/:id', (req, res) => { const parsed = ticketSchema.partial().safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() }); const ticket = updateTicket(req.params.id, parsed.data); return ticket ? res.json({ ticket }) : res.status(404).json({ error: 'ticket_not_found' }); });
ticketRoutes.delete('/:id', (req, res) => deleteTicket(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'ticket_not_found' }));




