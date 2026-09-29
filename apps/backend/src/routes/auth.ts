import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export const authRoutes = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'solaragent-super-secret-key-32-chars-minimum-needed';

export function signToken(payload: { id: string; email: string; role: string; exp?: number }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  if (!token) return null;
  if (token === 'dev-token') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSignature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginCredentials = credentials.extend({
  role: z.enum(['admin', 'customer']).default('customer'),
});

const registration = credentials.extend({
  fullName: z.string().trim().min(2),
  contactNumber: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
  division: z.string().trim().min(1),
  district: z.string().trim().min(1),
  upazila: z.string().trim().min(1),
  village: z.string().trim().min(1),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'passwords_do_not_match' });

authRoutes.post('/login', async (req, res) => {
  const parsed = loginCredentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
    if (!user || user.role !== parsed.data.role || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'account_deactivated_contact_support' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
        division: user.division,
        district: user.district,
        upazila: user.upazila,
        village: user.village,
        tenantId: user.tenantId,
      },
    });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

authRoutes.post('/signup', async (req, res) => {
  const parsed = registration.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [user] = await db.insert(users).values({
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      role: 'customer',
      fullName: parsed.data.fullName,
      contactNumber: parsed.data.contactNumber,
      division: parsed.data.division,
      district: parsed.data.district,
      upazila: parsed.data.upazila,
      village: parsed.data.village,
    }).returning();

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
        division: user.division,
        district: user.district,
        upazila: user.upazila,
        village: user.village,
        tenantId: user.tenantId,
      },
      message: 'Account created successfully. Welcome to SolarAgent Pro!',
    });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    return res.status(code === '23505' ? 409 : 503).json({ error: code === '23505' ? 'email_already_registered' : 'database_unavailable' });
  }
});

authRoutes.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });

  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.id));
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        contactNumber: user.contactNumber,
        division: user.division,
        district: user.district,
        upazila: user.upazila,
        village: user.village,
        isActive: user.isActive,
      },
    });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

authRoutes.patch('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });

  const { fullName, contactNumber, division, district, upazila, village } = req.body;

  try {
    const [updated] = await db.update(users).set({
      ...(fullName ? { fullName: String(fullName) } : {}),
      ...(contactNumber ? { contactNumber: String(contactNumber) } : {}),
      ...(division ? { division: String(division) } : {}),
      ...(district ? { district: String(district) } : {}),
      ...(upazila ? { upazila: String(upazila) } : {}),
      ...(village ? { village: String(village) } : {}),
      updatedAt: new Date(),
    }).where(eq(users.id, payload.id)).returning();

    if (!updated) return res.status(404).json({ error: 'user_not_found' });

    return res.json({
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        fullName: updated.fullName,
        contactNumber: updated.contactNumber,
        division: updated.division,
        district: updated.district,
        upazila: updated.upazila,
        village: updated.village,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});
