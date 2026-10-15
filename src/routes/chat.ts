// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { requireAuth } from './auth';
import { supportTickets, orders } from '../db/schema';
import { processChatbotMessage } from '../services/chatbot';

export const chatRoutes = new Router();

const chatSchema = z.object({
  mode: z.enum(['org_support', 'technical_assistant']).default('technical_assistant'),
  message: z.string().min(1).max(4000),
  context: z.object({
    page: z.string().optional(),
    step: z.number().optional(),
    projectType: z.enum(['solar', 'wind', 'hybrid']).optional(),
    systemType: z.enum(['on-grid', 'off-grid', 'hybrid-grid']).optional(),
    connectedLoadW: z.number().optional(),
    dailyConsumptionKwh: z.number().optional(),
    rooftopAreaSqFt: z.number().optional(),
    rooftopType: z.string().optional(),
    validationError: z.string().optional(),
    userId: z.string().optional(),
    userEmail: z.string().optional(),
  }).optional(),
});

chatRoutes.post('/', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await processChatbotMessage({
      mode: parsed.data.mode,
      userMessage: parsed.data.message,
      context: parsed.data.context,
    });
    return res.json(result);
  } catch (error) {
    console.error('Chat processing error:', error);
    return res.status(500).json({ error: 'chat_processing_failed' });
  }
});

const ticketSchema = z.object({
  userId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  title: z.string().min(3),
  category: z.string().default('support'),
  description: z.string().min(5),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

chatRoutes.post('/ticket', requireAuth, async (req, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    if (parsed.data.orderId) {
      const [order] = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId));
      if (!order || (req.user!.role !== 'admin' && order.userId !== req.user!.id)) return res.status(403).json({ error: 'order_access_denied' });
    }
    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const [ticket] = await db.insert(supportTickets).values({
      userId: req.user!.id,
      orderId: parsed.data.orderId,
      ticketNumber,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      priority: parsed.data.priority,
      status: 'open',
      messages: [{ sender: 'customer', text: parsed.data.description, sentAt: new Date().toISOString() }],
    }).returning();

    return res.status(201).json({
      ticket,
      message: `Support ticket ${ticketNumber} created successfully. Our team will follow up within 24 business hours.`,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});




