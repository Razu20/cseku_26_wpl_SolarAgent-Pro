import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { orders, payments } from '../db/schema.js';
import { sendOrderConfirmationEmail } from './email.js';

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
  const appUrl = (process.env.APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')).replace(/\/+$/, '');
  if (!appUrl) {
    throw new Error('app_url_missing');
  }

  if (process.env.NODE_ENV === 'production' && (!process.env.SSLCOMMERZ_STORE_ID || !process.env.SSLCOMMERZ_STORE_PASSWORD)) {
    throw new Error('sslcommerz_credentials_missing');
  }

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Check if an order already has an active payment to prevent duplicate charges
  const existingPayments = await db.select().from(payments).where(eq(payments.orderId, input.orderId));
  const completedPayment = existingPayments.find((p) => p.status === 'success');
  if (completedPayment) {
    throw new Error('order_already_paid');
  }

  // Record initial pending payment
  await db.insert(payments).values({
    orderId: input.orderId,
    userId: input.userId,
    amount: String(input.totalAmount),
    currency: 'BDT',
    method: 'sslcommerz',
    transactionId,
    status: 'pending',
    rawResponse: { initiatedAt: new Date().toISOString() },
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
      formParams.append('success_url', `${appUrl}/api/v1/payments/sslcommerz/success`);
      formParams.append('fail_url', `${appUrl}/api/v1/payments/sslcommerz/fail`);
      formParams.append('cancel_url', `${appUrl}/api/v1/payments/sslcommerz/cancel`);
      formParams.append('ipn_url', `${appUrl}/api/v1/payments/sslcommerz/ipn`);
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
      console.warn('SSLCommerz gateway session call failed, using sandbox simulator:', (err as Error).message);
    }
  }

  if (!isSandbox) {
    throw new Error('sslcommerz_gateway_unavailable');
  }

  // Deterministic Sandbox Gateway URL / Simulator for local development.
  const sandboxGatewayUrl = `${appUrl}/api/v1/payments/sslcommerz/simulator?tran_id=${transactionId}&amount=${input.totalAmount}&order_id=${input.orderId}&return_url=${encodeURIComponent(`${appUrl}/customer?payment=success&tran_id=${transactionId}`)}`;

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
      const res = await fetch(validatorUrl);
      if (res.ok) {
        validationResponse = await res.json();
        if (
          (validationResponse.status === 'VALID' || validationResponse.status === 'VALIDATED') &&
          Number(validationResponse.amount) >= Number(payment.amount)
        ) {
          isValidated = true;
        }
      }
    } catch (err) {
      console.error('SSLCommerz server-side validator error:', err);
    }
  } else {
    // Sandbox / Simulator verified
    isValidated = true;
    validationResponse = { simulated: true, verifiedAt: new Date().toISOString() };
  }

  if (isValidated) {
    const verifiedAt = new Date();
    await db.update(payments).set({
      valId,
      status: 'success',
      rawResponse: validationResponse,
      verifiedAt,
    }).where(eq(payments.id, payment.id));

    if (payment.orderId) {
      const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId));
      if (order) {
        await db.update(orders).set({
          paymentStatus: 'verified',
          paymentTransactionId: transactionId,
          status: 'confirmed',
          updatedAt: verifiedAt,
        }).where(eq(orders.id, order.id));

        // Send email confirmation if not already sent
        if (!order.emailSent && order.email) {
          await sendOrderConfirmationEmail({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.email,
            projectType: order.projectType,
            totalAmount: Number(order.totalAmount),
            paymentMethod: 'sslcommerz',
            paymentStatus: 'verified',
            division: order.division,
            district: order.district,
            address: order.address ?? undefined,
          });
          await db.update(orders).set({ emailSent: true }).where(eq(orders.id, order.id));
        }
      }
    }
    return { success: true, orderId: payment.orderId ?? undefined };
  }

  await db.update(payments).set({
    status: 'failed',
    rawResponse: validationResponse,
  }).where(eq(payments.id, payment.id));

  return { success: false, error: 'payment_validation_failed' };
}
