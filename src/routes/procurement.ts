// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import {
  createProduct,
  createQuote,
  deleteProduct,
  deleteQuote,
  getProduct,
  getQuote,
  listProducts,
  listQuotes,
  updateProduct,
  updateQuote,
} from '../store';

export const procurementRoutes = new Router();

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(['preferred', 'approved', 'conditional', 'blocked']).default('approved'),
  price: z.number().nonnegative(),
});

const quoteSchema = z.object({
  projectId: z.string().min(1),
  total: z.number().nonnegative(),
  marginPercent: z.number().min(0).max(100),
  validityDays: z.number().int().positive(),
  status: z.string().default('draft'),
});

procurementRoutes.get('/products', (_req, res) => res.json({ products: listProducts() }));
procurementRoutes.post('/products', (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ product: createProduct(parsed.data) });
});
procurementRoutes.get('/products/:id', (req, res) => {
  const product = getProduct(req.params.id);
  return product ? res.json({ product }) : res.status(404).json({ error: 'product_not_found' });
});
procurementRoutes.patch('/products/:id', (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const product = updateProduct(req.params.id, parsed.data);
  return product ? res.json({ product }) : res.status(404).json({ error: 'product_not_found' });
});
procurementRoutes.delete('/products/:id', (req, res) => {
  return deleteProduct(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'product_not_found' });
});

procurementRoutes.get('/quotes', (_req, res) => res.json({ quotes: listQuotes() }));
procurementRoutes.post('/quotes', (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.status(201).json({ quote: createQuote(parsed.data) });
});
procurementRoutes.get('/quotes/:id', (req, res) => {
  const quote = getQuote(req.params.id);
  return quote ? res.json({ quote }) : res.status(404).json({ error: 'quote_not_found' });
});
procurementRoutes.patch('/quotes/:id', (req, res) => {
  const parsed = quoteSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const quote = updateQuote(req.params.id, parsed.data);
  return quote ? res.json({ quote }) : res.status(404).json({ error: 'quote_not_found' });
});
procurementRoutes.delete('/quotes/:id', (req, res) => {
  return deleteQuote(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'quote_not_found' });
});




