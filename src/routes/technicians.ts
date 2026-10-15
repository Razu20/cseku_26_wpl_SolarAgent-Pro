// @ts-nocheck
import { Router } from '../lib/router';
import { z } from 'zod';
import { desc, eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { technicians, technicianAssignments, orders, technicianPayments, users, notifications } from '../db/schema';
import { deductStockForInstallation } from './inventory';
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth';
import { canTransitionOrderStatus } from '../lib/orderLifecycle';

export const technicianRoutes = new Router();

// ==========================================
// 1. CONFLICT CHECKING & ASSIGNMENT RECOMMENDATION
// ==========================================

// Check if a technician has a schedule conflict
technicianRoutes.post('/technicians/check-conflict', async (req, res) => {
  try {
    const schema = z.object({
      technicianId: z.string().uuid(),
      scheduledDate: z.string().min(8), // YYYY-MM-DD
      scheduledSlot: z.string().optional().default('full_day'),
      excludeOrderId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { technicianId, scheduledDate, scheduledSlot, excludeOrderId } = parsed.data;

    // Look for active assignments on the same date
    const existingAssignments = await db.select().from(technicianAssignments).where(
      and(
        eq(technicianAssignments.technicianId, technicianId),
        eq(technicianAssignments.scheduledDate, scheduledDate),
        sql`${technicianAssignments.status} != 'cancelled'`
      )
    );

    const conflicting = existingAssignments.find((a) => {
      if (excludeOrderId && a.orderId === excludeOrderId) return false;
      if (a.scheduledSlot === 'full_day' || scheduledSlot === 'full_day') return true;
      return a.scheduledSlot === scheduledSlot;
    });

    if (conflicting) {
      const [conflictingOrder] = await db.select().from(orders).where(eq(orders.id, conflicting.orderId));
      return res.json({
        hasConflict: true,
        conflictingOrder: conflictingOrder ? {
          orderNumber: conflictingOrder.orderNumber,
          customerName: conflictingOrder.customerName,
          district: conflictingOrder.district,
          scheduledDate: conflicting.scheduledDate,
          scheduledSlot: conflicting.scheduledSlot,
        } : null,
        message: `Technician is already booked on ${scheduledDate} for Order #${conflictingOrder?.orderNumber || 'Active Job'}.`,
      });
    }

    return res.json({
      hasConflict: false,
      message: 'Technician is fully available for this date and time slot.',
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Recommend suitable technicians for a project
technicianRoutes.get('/technicians/recommend', async (req, res) => {
  try {
    const division = (req.query.division as string || '').toLowerCase();
    const district = (req.query.district as string || '').toLowerCase();
    const projectType = (req.query.projectType as string || 'solar').toLowerCase();
    const scheduledDate = req.query.scheduledDate as string;
    const scheduledSlot = (req.query.scheduledSlot as string || 'full_day');

    const allTechs = await db.select().from(technicians).where(eq(technicians.active, true));

    // Get assignments on the given date if date is provided
    let bookedTechIds = new Set<string>();
    if (scheduledDate) {
      const booked = await db.select().from(technicianAssignments).where(
        and(
          eq(technicianAssignments.scheduledDate, scheduledDate),
          sql`${technicianAssignments.status} != 'cancelled'`
        )
      );
      for (const b of booked) {
        if (b.scheduledSlot === 'full_day' || scheduledSlot === 'full_day' || b.scheduledSlot === scheduledSlot) {
          bookedTechIds.add(b.technicianId);
        }
      }
    }

    const scored = allTechs.map((tech) => {
      let score = 50; // base score
      const isBooked = bookedTechIds.has(tech.id);
      if (isBooked) score -= 100; // heavy penalty for conflict

      // Location match
      const techDiv = (tech.division || tech.serviceArea || '').toLowerCase();
      const techDist = (tech.district || '').toLowerCase();
      if (district && techDist.includes(district)) {
        score += 40;
      } else if (division && techDiv.includes(division)) {
        score += 25;
      }

      // Skill match
      const skills = (tech.skills as string[]) || [];
      const skillsStr = skills.join(' ').toLowerCase();
      if (projectType === 'solar' && (skillsStr.includes('solar') || tech.solarExperienceYears! > 0)) {
        score += 20;
      }
      if (projectType === 'wind' && (skillsStr.includes('wind') || tech.windExperienceYears! > 0)) {
        score += 25;
      }
      if (projectType === 'hybrid' && (skillsStr.includes('hybrid') || tech.hybridExperienceYears! > 0)) {
        score += 25;
      }

      // Rating bonus
      score += Number(tech.rating || 4.5) * 4;

      // Workload deduction
      score -= Math.min(20, (tech.activeJobs || 0) * 5);

      return {
        ...tech,
        hasConflict: isBooked,
        recommendationScore: Math.max(0, score),
      };
    });

    scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return res.json({ technicians: scored });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 2. ASSIGN TECHNICIAN TO ORDER (WITH CONFLICT PREVENTION)
// ==========================================
technicianRoutes.post('/admin/assign-technician', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      orderId: z.string().uuid(),
      technicianId: z.string().uuid(),
      scheduledDate: z.string().min(8),
      scheduledSlot: z.string().optional().default('full_day'),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { orderId, technicianId, scheduledDate, scheduledSlot, notes } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [currentOrder] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
      if (!currentOrder) { const error = new Error('order_not_found'); error.name = 'OrderNotFound'; throw error; }
      if (!canTransitionOrderStatus(currentOrder.status, 'assigned')) { const error = new Error('invalid_order_status_transition'); error.name = 'TechnicianScheduleConflict'; throw error; }
      await tx.select().from(technicians).where(eq(technicians.id, technicianId)).for('update');
      const existingAssignments = await tx.select().from(technicianAssignments).where(
        and(
          eq(technicianAssignments.technicianId, technicianId),
          eq(technicianAssignments.scheduledDate, scheduledDate),
          sql`${technicianAssignments.status} != 'cancelled'`
        )
      );

      const conflict = existingAssignments.find((a) => {
        if (a.orderId === orderId) return false;
        return a.scheduledSlot === 'full_day' || scheduledSlot === 'full_day' || a.scheduledSlot === scheduledSlot;
      });

      if (conflict) {
        const error = new Error('technician_schedule_conflict');
        error.name = 'TechnicianScheduleConflict';
        throw error;
      }

      const [tech] = await tx.select().from(technicians).where(eq(technicians.id, technicianId));
      if (!tech || !tech.active) {
        const error = new Error('technician_not_available');
        error.name = 'TechnicianNotAvailable';
        throw error;
      }

      const [existing] = await tx.select().from(technicianAssignments).where(and(eq(technicianAssignments.orderId, orderId), eq(technicianAssignments.technicianId, technicianId)));
      if (existing && existing.scheduledDate === scheduledDate && existing.scheduledSlot === scheduledSlot && existing.status !== 'cancelled') return { assignment: existing, order: currentOrder, technician: tech };
      await tx.update(technicianAssignments).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(technicianAssignments.orderId, orderId));
      if (currentOrder.technicianId && currentOrder.technicianId !== technicianId) await tx.update(technicians).set({ activeJobs: sql`GREATEST(0, ${technicians.activeJobs} - 1)` }).where(eq(technicians.id, currentOrder.technicianId));
      const [assignment] = await tx.insert(technicianAssignments).values({
        orderId,
        technicianId,
        scheduledDate,
        scheduledSlot,
        status: 'assigned',
        notes,
      }).returning();

      const [order] = await tx.update(orders).set({
        technicianId,
        scheduledDate,
        scheduledSlot,
        status: 'assigned',
        installationStatus: 'assigned',
        notes: notes ? `${notes}` : undefined,
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId)).returning();

      if (!order) {
        const error = new Error('order_not_found');
        error.name = 'OrderNotFound';
        throw error;
      }

      const [updatedTech] = await tx.update(technicians).set({
        activeJobs: (tech.activeJobs || 0) + (currentOrder.technicianId === technicianId ? 0 : 1),
        availability: 'busy',
        updatedAt: new Date(),
      }).where(eq(technicians.id, tech.id)).returning();

      await tx.insert(notifications).values({
        role: 'technician',
        userId: updatedTech.userId || undefined,
        title: `New Assignment: Order #${order.orderNumber}`,
        message: `You have been scheduled for physical installation of a ${order.projectType.toUpperCase()} system on ${scheduledDate} (${scheduledSlot}).`,
        type: 'assignment',
        link: '/technician',
      });

      if (order.userId) {
        await tx.insert(notifications).values({
          role: 'customer',
          userId: order.userId,
          title: `Technician Assigned: Order #${order.orderNumber}`,
          message: `Certified engineer ${updatedTech.name} has been assigned for your installation on ${scheduledDate}.`,
          type: 'assignment',
          link: '/customer',
        });
      }

      return { assignment, order, technician: updatedTech };
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TechnicianScheduleConflict') {
      return res.status(409).json({
        error: 'technician_schedule_conflict',
        message: 'This technician is already booked on this date/time. Please select another technician or change schedule.',
      });
    }
    if (err instanceof Error && err.name === 'TechnicianNotAvailable') {
      return res.status(409).json({ error: 'technician_not_available', message: 'The selected technician is inactive or unavailable.' });
    }
    if (err instanceof Error && err.name === 'OrderNotFound') {
      return res.status(404).json({ error: 'order_not_found' });
    }
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// 3. TECHNICIAN PORTAL APIs (FOR LOGGED-IN TECHNICIAN)
// ==========================================

// Technician Dashboard Stats
technicianRoutes.get('/technician/dashboard', requireAuth, requireRole(['technician']), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    let [tech] = await db.select().from(technicians).where(eq(technicians.userId, userId));

    // Fallback: match by email
    if (!tech) {
      [tech] = await db.select().from(technicians).where(eq(technicians.email, req.user!.email));
    }

    if (!tech) {
      return res.status(404).json({ error: 'technician_profile_not_found' });
    }

    // Fetch assigned jobs
    const assignedOrders = await db.select().from(orders).where(eq(orders.technicianId, tech.id)).orderBy(desc(orders.createdAt));

    // Fetch payments / earnings
    const payments = await db.select().from(technicianPayments).where(eq(technicianPayments.technicianId, tech.id));

    const totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const paidEarnings = payments.filter((p) => p.status === 'completed' || p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingEarnings = totalEarnings - paidEarnings;

    const completedJobs = assignedOrders.filter((o) => o.status === 'completed' || o.installationStatus === 'completed').length;
    const activeJobs = assignedOrders.filter((o) => ['assigned', 'installation_in_progress'].includes(o.status)).length;
    const pendingJobs = assignedOrders.filter((o) => o.status === 'submitted' || o.status === 'awaiting_payment').length;

    return res.json({
      profile: tech,
      stats: {
        totalJobs: assignedOrders.length,
        completedJobs: Math.max(completedJobs, tech.completedJobs || 0),
        activeJobs,
        pendingJobs,
        totalEarnings,
        paidEarnings,
        pendingEarnings,
        rating: Number(tech.rating || 4.85),
      },
      recentJobs: assignedOrders.slice(0, 10),
      recentPayments: payments.slice(0, 10),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Technician Job Status Update (e.g. En Route -> Installation in progress -> Completed)
technicianRoutes.patch('/technician/jobs/:orderId/status', requireAuth, requireRole(['technician']), async (req: AuthenticatedRequest, res) => {
  try {
    return await db.transaction(async (tx) => {
    const { orderId } = req.params;
    const { status, completionNotes } = req.body; // 'installation_in_progress' | 'completed'

    const [order] = await tx.select().from(orders).where(eq(orders.id, String(orderId))).for('update');
    if (!order) return res.status(404).json({ error: 'order_not_found' });

    let [tech] = await tx.select().from(technicians).where(eq(technicians.userId, req.user!.id));
    if (!tech || order.technicianId !== tech.id) {
      return res.status(403).json({ error: 'job_assignment_access_denied' });
    }
    if (!['installation_in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'invalid_technician_status' });
    }
    if (!canTransitionOrderStatus(order.status, status)) {
      return res.status(409).json({ error: 'invalid_order_status_transition', from: order.status, to: status });
    }

    if (order.status === status) return res.json({ success: true, message: 'Status already applied.' });
    if (status === 'completed') {
      // 1. Mark Order Completed
      await tx.update(orders).set({
        status: 'completed',
        installationStatus: 'completed',
        notes: completionNotes ? `${order.notes || ''}\n[Completion Note]: ${completionNotes}` : order.notes,
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id));

      // 2. Mark Assignment Completed
      await tx.update(technicianAssignments).set({
        status: 'completed',
        updatedAt: new Date(),
      }).where(eq(technicianAssignments.orderId, order.id));

      // 3. Update Technician Stats
      if (tech) {
        await tx.update(technicians).set({
          completedJobs: (tech.completedJobs || 0) + 1,
          activeJobs: Math.max(0, (tech.activeJobs || 1) - 1),
          availability: (tech.activeJobs || 1) > 1 ? 'busy' : 'available',
          updatedAt: new Date(),
        }).where(eq(technicians.id, tech.id));

        // 4. Generate Technician Earning Record (e.g. 5,000 BDT or 5% of project amount)
        const commissionAmount = Math.max(5000, Math.round(Number(order.totalAmount) * 0.05));
        await tx.insert(technicianPayments).values({
          technicianId: tech.id,
          orderId: order.id,
          amount: String(commissionAmount),
          paymentType: 'installation_commission',
          status: 'pending', // Pending payout approval by admin
          method: 'bank_transfer',
          notes: `Earned from completion of project #${order.orderNumber} (${order.projectType.toUpperCase()})`,
        });
      }

      // 5. Automatically Deduct Hardware Stock from Warehouse
      await deductStockForInstallation(order.id, tx);

      // 6. Notify Customer & Admin
      if (order.userId) {
        await tx.insert(notifications).values({
          role: 'customer',
          userId: order.userId,
          title: `Installation Completed: Order #${order.orderNumber}`,
          message: `Your ${order.projectType.toUpperCase()} system installation has been successfully commissioned. Net-metering certificate is now active.`,
          type: 'order',
          link: '/customer',
        });
      }

      await tx.insert(notifications).values({
        role: 'admin',
        title: `Job Completed: Order #${order.orderNumber}`,
        message: `Technician ${tech?.name || 'Assigned Tech'} completed physical installation of Order #${order.orderNumber}. Hardware deducted from inventory.`,
        type: 'order',
        link: '/admin/orders',
      });

      return res.json({ success: true, message: 'Installation successfully marked as completed!' });
    } else {
      // Ongoing status update (e.g. installation_in_progress)
      await tx.update(orders).set({
        status: status,
        installationStatus: status,
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id));

      await tx.update(technicianAssignments).set({
        status: status,
        updatedAt: new Date(),
      }).where(eq(technicianAssignments.orderId, order.id));

      await tx.update(technicians).set({
        availability: 'busy',
        updatedAt: new Date(),
      }).where(eq(technicians.id, tech.id));

      return res.json({ success: true, message: `Status updated to ${status}`, technician: { id: tech.id, availability: 'busy' } });
    }
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});




