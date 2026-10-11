import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { orders, payments } from '../db/schema.js';
import { initializeSslCommerzPayment, verifyServerSidePayment } from '../services/payment.js';
import { requireAuth, type AuthenticatedRequest } from './auth.js';
import { canTransitionOrderStatus } from '../lib/orderLifecycle.js';

export const paymentRoutes = Router();

// 1. Initialize SSLCommerz online payment
const initPaymentSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

paymentRoutes.post('/sslcommerz/init', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = initPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, parsed.data.orderId));
    if (!order) return res.status(404).json({ error: 'order_not_found' });
    if (req.user!.role !== 'admin' && order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'order_access_denied' });
    }
    if (!canTransitionOrderStatus(order.status, 'awaiting_payment')) {
      return res.status(409).json({ error: 'invalid_order_status_transition', from: order.status, to: 'awaiting_payment' });
    }

    if (order.paymentStatus === 'verified') {
      return res.status(400).json({ error: 'order_already_paid' });
    }

    const initResult = await initializeSslCommerzPayment({
      orderId: order.id,
      userId: parsed.data.userId || order.userId || undefined,
      totalAmount: Number(order.totalAmount),
      customerName: order.customerName,
      customerEmail: order.email || 'customer@solaragent.com.bd',
      customerPhone: order.contactNumber,
      customerAddress: `${order.village}, ${order.upazila}`,
      customerCity: order.district,
    });

    return res.json(initResult);
  } catch (error) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({ error: (error as Error).message || 'payment_init_failed' });
  }
});

// 2. SSLCommerz Sandbox / Simulator Gateway Page (HTML)
paymentRoutes.get('/sslcommerz/simulator', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'route_not_found' });
  }

  const { tran_id, amount, order_id, return_url } = req.query;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SSLCommerz Payment Gateway (Sandbox)</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .box { background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 100%; max-width: 480px; padding: 32px; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .logo { font-size: 20px; font-weight: 800; color: #1a365d; }
        .badge { background: #fed7d7; color: #c53030; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 12px; text-transform: uppercase; }
        .amount-display { background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; }
        .amount-display span { font-size: 13px; color: #4a5568; }
        .amount-display strong { display: block; font-size: 28px; color: #2b6cb0; margin-top: 4px; }
        .btn-group { display: flex; flex-direction: column; gap: 12px; }
        .btn { padding: 14px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; display: block; }
        .btn-pay { background: #38a169; color: white; }
        .btn-pay:hover { background: #2f855a; }
        .btn-fail { background: #e53e3e; color: white; }
        .btn-cancel { background: #edf2f7; color: #4a5568; }
        .details { font-size: 12px; color: #718096; margin-top: 24px; border-top: 1px solid #edf2f7; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="header">
          <div class="logo">SSLCommerz</div>
          <div class="badge">SANDBOX TEST GATEWAY</div>
        </div>

        <div class="amount-display">
          <span>Renewable Project Total Payable</span>
          <strong>BDT ${Number(amount).toLocaleString()}</strong>
        </div>

        <div class="btn-group">
          <form method="POST" action="/api/v1/payments/sslcommerz/success">
            <input type="hidden" name="tran_id" value="${tran_id}">
            <input type="hidden" name="val_id" value="SIM_${Date.now()}">
            <input type="hidden" name="amount" value="${amount}">
            <input type="hidden" name="return_url" value="${return_url || ''}">
            <button class="btn btn-pay" style="width: 100%;" type="submit">✓ Simulate Successful Payment</button>
          </form>

          <form method="POST" action="/api/v1/payments/sslcommerz/fail">
            <input type="hidden" name="tran_id" value="${tran_id}">
            <input type="hidden" name="return_url" value="${return_url || ''}">
            <button class="btn btn-fail" style="width: 100%;" type="submit">✕ Simulate Payment Failure</button>
          </form>

          <form method="POST" action="/api/v1/payments/sslcommerz/cancel">
            <input type="hidden" name="tran_id" value="${tran_id}">
            <input type="hidden" name="return_url" value="${return_url || ''}">
            <button class="btn btn-cancel" style="width: 100%;" type="submit">Cancel Transaction</button>
          </form>
        </div>

        <div class="details">
          <div><strong>Transaction ID:</strong> ${tran_id}</div>
          <div><strong>Order Ref:</strong> ${order_id}</div>
          <div style="margin-top: 6px;">Server-side verification will validate transaction signature before confirming order.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// 3. SSLCommerz Success Callback (Server-side validation)
paymentRoutes.post('/sslcommerz/success', async (req, res) => {
  const tranId = req.body.tran_id || req.query.tran_id;
  const valId = req.body.val_id || req.query.val_id || `SIM_${Date.now()}`;
  const returnUrl = req.body.return_url || req.query.return_url;

  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

  if (!tranId) {
    return res.status(400).send('Missing transaction id');
  }

  const verification = await verifyServerSidePayment(String(valId), String(tranId));

  if (verification.success) {
    const redirectUrl = returnUrl ? decodeURIComponent(returnUrl) : `${appUrl}/customer?payment=success&orderId=${verification.orderId}&tran_id=${tranId}`;
    return res.redirect(redirectUrl);
  } else {
    return res.redirect(`${appUrl}/customer?payment=failed&error=${verification.error}`);
  }
});

// 4. SSLCommerz Fail Callback
paymentRoutes.post('/sslcommerz/fail', async (req, res) => {
  const tranId = req.body.tran_id || req.query.tran_id;
  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

  if (tranId) {
    await db.update(payments).set({ status: 'failed' }).where(eq(payments.transactionId, String(tranId)));
  }

  return res.redirect(`${appUrl}/customer?payment=failed&tran_id=${tranId}`);
});

// 5. SSLCommerz Cancel Callback
paymentRoutes.post('/sslcommerz/cancel', async (req, res) => {
  const tranId = req.body.tran_id || req.query.tran_id;
  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

  if (tranId) {
    await db.update(payments).set({ status: 'cancelled' }).where(eq(payments.transactionId, String(tranId)));
  }

  return res.redirect(`${appUrl}/customer?payment=cancelled&tran_id=${tranId}`);
});

// 6. COD (Cash on Delivery / On-Site) Order Confirmation
paymentRoutes.post('/cod/confirm', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'order_id_required' });

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return res.status(404).json({ error: 'order_not_found' });
    if (req.user!.role !== 'admin' && order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'order_access_denied' });
    }

    // COD is set to payment_pending_verification, never auto-paid
    await db.update(orders).set({
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      status: 'awaiting_payment',
      updatedAt: new Date(),
    }).where(eq(orders.id, order.id));

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        status: 'awaiting_payment',
        instruction: 'Payment will be collected by certified technician upon on-site physical inspection.',
      },
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});
