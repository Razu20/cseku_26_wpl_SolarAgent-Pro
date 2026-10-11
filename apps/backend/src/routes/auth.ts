import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../db/client.js';
import { users, technicians, companies } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export const authRoutes = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'solaragent-super-secret-key-32-chars-minimum-needed';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: 'admin' | 'customer' | 'technician' | 'supplier';
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function signToken(payload: AuthUserPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthUserPayload | null {
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

// Middleware: Authenticate Bearer token
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }

  req.user = payload;
  next();
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
  email: z.string().email(),
  password: z.string().min(8),
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
  experienceYears: z.number().optional(),
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

    const token = signToken({ id: user.id, email: user.email, role: user.role as any });
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
    const targetRole = parsed.data.role || 'customer';
    const email = parsed.data.email.trim().toLowerCase();

    const [user] = await db.insert(users).values({
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
      await db.insert(technicians).values({
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
        experienceYears: parsed.data.experienceYears || 2,
        rating: '4.80',
        active: true,
        availability: 'available',
      }).onConflictDoNothing();
    }

    // If role is supplier, automatically register company profile
    if (targetRole === 'supplier') {
      await db.insert(companies).values({
        name: parsed.data.companyName || parsed.data.fullName,
        description: `Registered renewable energy equipment supplier based in ${parsed.data.district}, ${parsed.data.division}.`,
        website: parsed.data.companyWebsite || '',
        country: 'Bangladesh',
        contactInformation: `${parsed.data.contactNumber} / ${email}`,
        status: 'active',
        verified: true,
        leadTimeDays: 7,
        minOrderQuantity: 5,
        rating: '4.85',
      }).onConflictDoNothing();
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role as any });
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
    const code = (error as { code?: string }).code;
    console.error('Signup failed:', {
      code,
      message: error instanceof Error ? error.message : String(error),
    });
    return res.status(code === '23505' ? 409 : 503).json({ error: code === '23505' ? 'email_already_registered' : 'database_unavailable' });
  }
});

// 3. GET CURRENT USER PROFILE
authRoutes.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

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

// 5. PASSWORD RECOVERY / RESET
authRoutes.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email_required' });

  try {
    const [user] = await db.select().from(users).where(eq(users.email, String(email).toLowerCase()));
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, instructions have been sent.' });
    }

    const resetToken = signToken({ id: user.id, email: user.email, role: user.role as any });
    return res.json({
      success: true,
      message: 'Password reset token generated.',
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

authRoutes.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'invalid_token_or_password_too_short' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'invalid_or_expired_reset_token' });
  }

  try {
    await db.update(users).set({
      passwordHash: hashPassword(newPassword),
      updatedAt: new Date(),
    }).where(eq(users.id, payload.id));

    return res.json({ success: true, message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});
