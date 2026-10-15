const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  projectType: string;
  systemCapacityKwp?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  division: string;
  district: string;
  address?: string;
  itemsSummary?: string;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'SolarAgent Pro <orders@solaragent.com.bd>';

  const subject = `Order Confirmed: ${data.orderNumber} - ${data.projectType.toUpperCase()} Renewable Energy System`;

  const recipient = data.customerEmail;
  data = { ...data, customerName: escapeHtml(data.customerName), customerEmail: escapeHtml(data.customerEmail), orderNumber: escapeHtml(data.orderNumber), district: escapeHtml(data.district), division: escapeHtml(data.division) };
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f7fafc; color: #2d3748; padding: 24px; }
        .card { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 32px; border: 1px solid #e2e8f0; }
        .header { border-bottom: 2px solid #319795; padding-bottom: 16px; margin-bottom: 24px; }
        .title { color: #2c7a7b; font-size: 24px; font-weight: bold; margin: 0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .details-table td { padding: 8px 12px; border-bottom: 1px solid #edf2f7; }
        .details-table td.label { font-weight: 600; color: #718096; width: 40%; }
        .total-row { font-size: 18px; font-weight: bold; color: #2b6cb0; }
        .notice-box { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
        .footer { font-size: 12px; color: #a0aec0; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1 class="title">SolarAgent Pro Bangladesh</h1>
          <p style="margin: 4px 0 0 0; color: #718096;">Renewable Energy Project Confirmation</p>
        </div>

        <p>Dear <strong>${data.customerName}</strong>,</p>
        <p>Thank you for submitting your project with SolarAgent Pro. Your renewable energy configuration has been registered under order number <strong>${data.orderNumber}</strong>.</p>

        <table class="details-table">
          <tr>
            <td class="label">Order Number</td>
            <td><strong>${data.orderNumber}</strong></td>
          </tr>
          <tr>
            <td class="label">Project Type</td>
            <td>${data.projectType.toUpperCase()} Renewable Energy System</td>
          </tr>
          ${data.systemCapacityKwp ? `<tr><td class="label">Estimated Capacity</td><td>${data.systemCapacityKwp} kWp</td></tr>` : ''}
          <tr>
            <td class="label">Installation Location</td>
            <td>${data.district}, ${data.division}</td>
          </tr>
          <tr>
            <td class="label">Payment Method</td>
            <td>${data.paymentMethod === 'sslcommerz' ? 'Online Payment (SSLCommerz)' : 'Cash on Delivery (COD / Site Verification)'}</td>
          </tr>
          <tr>
            <td class="label">Payment Status</td>
            <td><strong style="color: ${data.paymentStatus === 'verified' || data.paymentStatus === 'confirmed' ? '#38a169' : '#d69e2e'};">${data.paymentStatus.toUpperCase()}</strong></td>
          </tr>
          <tr class="total-row">
            <td class="label">Total Project Estimate</td>
            <td>BDT ${data.totalAmount.toLocaleString()}</td>
          </tr>
        </table>

        <div class="notice-box">
          <strong>Next Steps:</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>Our engineering dispatch team will assign a verified technician to your project location.</li>
            <li>A certified engineer will contact you at <strong>${data.customerEmail}</strong> to schedule on-site rooftop measurement & structural inspection.</li>
            <li>You can track live project status anytime from your Customer Dashboard.</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #718096;">
          For assistance, reach our hotline at <strong>+880 9612-SOLAR (76527)</strong> or email <strong>support@solaragent.com.bd</strong>.
        </p>

        <div class="footer">
          SolarAgent Pro Bangladesh Ltd. &bull; Level 9, Green Energy Tower, 45 Kemal Ataturk Avenue, Banani, Dhaka-1213 &bull; Licensed Renewable Energy Operator
        </div>
      </div>
    </body>
    </html>
  `;

  if (!apiKey) {
    return { success: false, error: 'email_provider_not_configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend email error:', err);
      return { success: false, error: err };
    }

    const result = (await response.json()) as any;
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Resend dispatch failed:', error);
    return { success: false, error: (error as Error).message };
  }
}


export async function sendPasswordResetEmail(email: string, token: string): Promise<{ success: boolean }> {
  const appUrl = process.env.APP_URL;
  if (!appUrl || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { success: false };
  const link = new URL('/reset-password', appUrl);
  link.hash = `token=${token}`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: 'Reset your SolarAgent Pro password', html: `<p>Use this link to reset your password within 30 minutes.</p><p><a href="${escapeHtml(link.toString())}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>` }),
    });
    return { success: response.ok };
  } catch { return { success: false }; }
}
