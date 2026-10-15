import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { orders, payments } from '../db/schema';
import { sendOrderConfirmationEmail } from './email';

export interface SslcommerzInitInput {
  orderId: string;
  userId?: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
}

export interface SslcommerzInitResult {
  gatewayUrl: string;
  transactionId: string;
  sessionKey?: string;
  isSandbox: boolean;
}

export async function initializeSslCommerzPayment(input: SslcommerzInitInput): Promise<SslcommerzInitResult> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID || 'solaragent_sandbox';
  const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'solaragent_passwd';
  const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';
  const apiUrl = (process.env.PUBLIC_API_URL || process.env.APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')).replace(/\/+$/, '');
  const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')).replace(/\/+$/, '');
  if (!apiUrl || !frontendUrl) {
    throw new Error('public_urls_missing');
  }

  if (process.env.NODE_ENV === 'production' && (!process.env.SSLCOMMERZ_STORE_ID || !process.env.SSLCOMMERZ_STORE_PASSWORD)) {
    throw new Error('sslcommerz_credentials_missing');
  }
  const allowSimulator = process.env.NODE_ENV !== 'production' && process.env.PAYMENT_SIMULATOR_ENABLED === 'true';

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Lock the order while creating an attempt so concurrent requests cannot
  // initialize multiple charges for the same order.
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for('update');
    if (!order || !['submitted', 'awaiting_payment'].includes(order.status)) throw new Error('order_not_payable');
    const attempts = await tx.select().from(payments).where(eq(payments.orderId, input.orderId));
    if (attempts.some((p) => p.status === 'success')) throw new Error('order_already_paid');
    if (attempts.some((p) => p.status === 'pending')) throw new Error('payment_already_pending');
    await tx.insert(payments).values({
      orderId: input.orderId, userId: input.userId, amount: String(input.totalAmount),
      currency: 'BDT', method: 'sslcommerz', transactionId, status: 'pending',
      rawResponse: { initiatedAt: new Date().toISOString() },
    });
  });

  // If live credentials are provided, attempt SSLCommerz session API call
  if (process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD) {
    const sessionUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    try {
      const formParams = new URLSearchParams();
      formParams.append('store_id', storeId);
      formParams.append('store_passwd', storePasswd);
      formParams.append('total_amount', String(input.totalAmount));
      formParams.append('currency', 'BDT');
      formParams.append('tran_id', transactionId);
      formParams.append('success_url', `${apiUrl}/api/v1/payments/sslcommerz/success`);
      formParams.append('fail_url', `${apiUrl}/api/v1/payments/sslcommerz/fail`);
      formParams.append('cancel_url', `${apiUrl}/api/v1/payments/sslcommerz/cancel`);
      formParams.append('ipn_url', `${apiUrl}/api/v1/payments/sslcommerz/ipn`);
      formParams.append('cus_name', input.customerName);
      formParams.append('cus_email', input.customerEmail || 'customer@solaragent.com.bd');
      formParams.append('cus_add1', input.customerAddress || 'Dhaka');
      formParams.append('cus_city', input.customerCity || 'Dhaka');
      formParams.append('cus_country', 'Bangladesh');
      formParams.append('cus_phone', input.customerPhone || '+8801700000000');
      formParams.append('shipping_method', 'NO');
      formParams.append('product_name', 'Renewable Energy System');
      formParams.append('product_category', 'Solar/Wind/Hybrid');
      formParams.append('product_profile', 'general');

      const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formParams.toString(),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        const json = (await response.json()) as any;
        if (json.status === 'SUCCESS' && json.GatewayPageURL) {
          return {
            gatewayUrl: json.GatewayPageURL,
            transactionId,
            sessionKey: json.sessionkey,
            isSandbox,
          };
        }
      }
    } catch (err) {
      console.warn('SSLCommerz gateway session call failed');
    }
  }

  if (!isSandbox || !allowSimulator) {
    await db.update(payments).set({ status: 'failed' }).where(eq(payments.transactionId, transactionId));
    throw new Error('sslcommerz_gateway_unavailable');
  }

  // Deterministic Sandbox Gateway URL / Simulator for local development.
  const sandboxGatewayUrl = `${apiUrl}/api/v1/payments/sslcommerz/simulator?tran_id=${transactionId}&amount=${input.totalAmount}&order_id=${input.orderId}&return_url=${encodeURIComponent(`${frontendUrl}/customer?payment=success&tran_id=${transactionId}`)}`;

  return {
    gatewayUrl: sandboxGatewayUrl,
    transactionId,
    isSandbox: true,
  };
}

export async function verifyServerSidePayment(
  valId: string,
  transactionId: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const [payment] = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
  if (!payment) return { success: false, error: 'payment_record_not_found' };

  if (payment.status === 'success') {
    return { success: true, orderId: payment.orderId ?? undefined };
  }

  const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD;

  let isValidated = false;
  let validationResponse: any = {};

  if (storeId && storePasswd && valId && !valId.startsWith('SIM_')) {
    const validatorUrl = isSandbox
      ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePasswd)}&format=json`
      : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePasswd)}&format=json`;

    try {
      const res = await fetch(validatorUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        validationResponse = await res.json();
        if (
          (validationResponse.status === 'VALID' || validationResponse.status === 'VALIDATED') &&
          Number(validationResponse.amount) === Number(payment.amount) &&
          validationResponse.tran_id === transactionId &&
          validationResponse.currency === payment.currency
        ) {
          isValidated = true;
        }
      }
    } catch (err) {
      console.error('SSLCommerz server-side validator request failed');
    }
  } else if (process.env.NODE_ENV !== 'production' && process.env.PAYMENT_SIMULATOR_ENABLED === 'true' && isSandbox && valId.startsWith('SIM_')) {
    // Explicit local-only simulator mode.
    isValidated = true;
    validationResponse = { simulated: true, verifiedAt: new Date().toISOString() };
  }

  if (isValidated) {
    const verifiedAt = new Date();
    const result = await db.transaction(async (tx) => {
    const [lockedPayment] = await tx.select().from(payments).where(eq(payments.id, payment.id)).for('update');
    if (lockedPayment.status === 'success') return { success: true, orderId: payment.orderId ?? undefined };
    const [lockedOrder] = payment.orderId ? await tx.select().from(orders).where(eq(orders.id, payment.orderId)).for('update') : [];
    if (!lockedOrder || ['cancelled', 'refunded', 'completed'].includes(lockedOrder.status)) return { success: false, error: 'order_not_payable' };
    await tx.update(payments).set({
      valId,
      status: 'success',
      rawResponse: validationResponse,
      verifiedAt,
    }).where(eq(payments.id, payment.id));

    if (payment.orderId) {
      const order = lockedOrder;
      if (order) {
        await tx.update(orders).set({
          paymentStatus: 'verified',
          paymentTransactionId: transactionId,
          status: 'confirmed',
          updatedAt: verifiedAt,
        }).where(eq(orders.id, order.id));

      }
    }
    return { success: true, orderId: payment.orderId ?? undefined };
    });
    if (result.success && payment.orderId) {
      const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId));
      if (order?.email && !order.emailSent) {
        try {
          const email = await sendOrderConfirmationEmail({ orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.email, projectType: order.projectType, totalAmount: Number(order.totalAmount), paymentMethod: 'sslcommerz', paymentStatus: 'verified', division: order.division, district: order.district });
          if (email.success) await db.update(orders).set({ emailSent: true }).where(eq(orders.id, order.id));
        } catch { console.warn('Order confirmation email requires retry'); }
      }
    }
    return result;
  }

  return { success: false, error: 'payment_validation_failed' };
}

