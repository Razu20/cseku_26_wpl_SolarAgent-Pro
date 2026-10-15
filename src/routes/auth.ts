// @ts-nocheck
import { Router, Request, Response, NextFunction } from '../lib/router';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../db/client';
import { users, technicians, companies, passwordResetTokens } from '../db/schema';
import { sendPasswordResetEmail } from '../services/email';
import { hashPassword, verifyPassword } from '../lib/password';

export const authRoutes = new Router();

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
}

export interface AuthUserPayload {
  id: string;
  email: string;
  role: 'admin' | 'customer' | 'technician' | 'supplier';
  exp?: number;
  credentialVersion?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function signToken(payload: AuthUserPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', jwtSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthUserPayload | null {
  if (!token) return null;
  if (token === 'dev-token') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', jwtSecret()).update(`${header}.${body}`).digest('base64url');
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const metadata = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (metadata.alg !== 'HS256' || metadata.typ !== 'JWT') return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!z.string().uuid().safeParse(payload.id).success || !z.string().email().safeParse(payload.email).success || !['admin', 'customer', 'technician', 'supplier'].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Middleware: Authenticate Bearer token
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }

  const [account] = await db.select({ id: users.id, role: users.role, isActive: users.isActive, passwordHash: users.passwordHash }).from(users).where(eq(users.id, payload.id));
  if (!account?.isActive || account.role !== payload.role || payload.credentialVersion !== crypto.createHash('sha256').update(account.passwordHash).digest('hex')) return res.status(401).json({ error: 'unauthorized' });
  req.user = payload;
  return next();
}

// Middleware: Require specific role(s)
export function requireRole(allowedRoles: Array<'admin' | 'customer' | 'technician' | 'supplier'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

const loginCredentials = credentials.extend({
  role: z.enum(['admin', 'customer', 'technician', 'supplier']).default('customer'),
});

const registration = credentials.extend({
  role: z.enum(['customer', 'technician', 'supplier']).default('customer'),
  fullName: z.string().trim().min(2),
  contactNumber: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/),
  division: z.string().trim().min(1),
  district: z.string().trim().min(1),
  upazila: z.string().trim().min(1),
  village: z.string().trim().min(1),
  confirmPassword: z.string().min(8),
  // Additional technician fields
  serviceArea: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  // Additional supplier fields
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'passwords_do_not_match' });

// 1. LOGIN
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

    const token = signToken({ id: user.id, email: user.email, role: user.role as any, credentialVersion: crypto.createHash('sha256').update(user.passwordHash).digest('hex') });
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

// 2. SIGNUP
authRoutes.post('/signup', async (req, res) => {
  const parsed = registration.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    jwtSecret();
    const targetRole = parsed.data.role || 'customer';
    const email = parsed.data.email.trim().toLowerCase();

    const user = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email,
      passwordHash: hashPassword(parsed.data.password),
      role: targetRole,
      fullName: parsed.data.fullName,
      contactNumber: parsed.data.contactNumber,
      division: parsed.data.division,
      district: parsed.data.district,
      upazila: parsed.data.upazila,
      village: parsed.data.village,
    }).returning();

    // If role is technician, automatically register technician profile
    if (targetRole === 'technician') {
      await tx.insert(technicians).values({
        userId: user.id,
        name: parsed.data.fullName,
        email,
        contactNumber: parsed.data.contactNumber,
        division: parsed.data.division,
        district: parsed.data.district,
        upazila: parsed.data.upazila,
        village: parsed.data.village,
        serviceArea: parsed.data.serviceArea || `${parsed.data.division} Division`,
        skills: parsed.data.skills || ['Solar PV Installation', 'Inverter Wiring', 'Battery Commissioning'],
        experienceYears: parsed.data.experienceYears || 0,
        rating: '0.00',
        active: false,
        availability: 'pending_verification',
      }).onConflictDoNothing();
    }

    // If role is supplier, automatically register company profile
    if (targetRole === 'supplier') {
      await tx.insert(companies).values({
        name: parsed.data.companyName || parsed.data.fullName,
        description: `Registered renewable energy equipment supplier based in ${parsed.data.district}, ${parsed.data.division}.`,
        website: parsed.data.companyWebsite || '',
        country: 'Bangladesh',
        contactInformation: `${parsed.data.contactNumber} / ${email}`,
        status: 'active',
        verified: false,
        leadTimeDays: 7,
        minOrderQuantity: 5,
        rating: '4.85',
      }).onConflictDoNothing();
    }

    return user;
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role as any, credentialVersion: crypto.createHash('sha256').update(user.passwordHash).digest('hex') });
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
      message: `Account created successfully. Welcome to SolarAgent Pro as a ${user.role}!`,
    });
  } catch (error: unknown) {
    const code = (error as any)?.cause?.code || (error as any)?.code;
    console.error('Signup failed:', {
      code,
    });
    return res.status(code === '23505' ? 409 : 503).json({ error: code === '23505' ? 'email_already_registered' : 'database_unavailable' });
  }
});

// 3. GET CURRENT USER PROFILE
authRoutes.get('/me', requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });

  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.id));
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    // If technician, fetch linked technician info
    let technicianProfile = null;
    if (user.role === 'technician') {
      const [tech] = await db.select().from(technicians).where(eq(technicians.userId, user.id));
      technicianProfile = tech || null;
    }

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
      technicianProfile,
    });
  } catch {
    return res.status(503).json({ error: 'database_unavailable' });
  }
});

// 4. UPDATE USER PROFILE
authRoutes.patch('/me', requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

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

// Reset tokens have a separate purpose, a short expiry, and single-use semantics.
const recoveryEmail = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
authRoutes.post('/forgot-password', async (req, res) => {
  const parsed = recoveryEmail.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_email' });
  if (!process.env.RESEND_API_KEY || !process.env.APP_URL || !process.env.EMAIL_FROM) {
    return res.status(503).json({ error: 'password_recovery_unavailable', message: 'Please contact support to recover your account.' });
  }
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email));
  if (user?.isActive) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.transaction(async (tx) => {
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
      await tx.insert(passwordResetTokens).values({ tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60_000) });
    });
    // Never disclose whether an address exists or return the token to the caller.
    const result = await sendPasswordResetEmail(user.email, token);
    if (!result.success) console.warn('Password reset email delivery requires retry');
  }
  return res.json({ success: true, message: 'If an account exists, password reset instructions have been sent.' });
});

authRoutes.post('/reset-password', async (req, res) => {
  const parsed = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), newPassword: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_token_or_password' });
  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const result = await db.transaction(async (tx) => {
    let [reset] = await tx.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) return false;
    const [account] = await tx.select().from(users).where(eq(users.id, reset.userId)).for('update');
    if (!account?.isActive) return false;
    [reset] = await tx.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).for('update');
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) return false;
    await tx.update(users).set({ passwordHash: hashPassword(parsed.data.newPassword), updatedAt: new Date() }).where(eq(users.id, reset.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.userId, reset.userId));
    return true;
  });
  return result ? res.json({ success: true, message: 'Your password has been reset. Please sign in again.' }) : res.status(401).json({ error: 'invalid_or_expired_reset_token' });
});
