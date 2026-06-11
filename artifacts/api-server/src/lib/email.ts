import { logger } from "./logger";

const APP_URL = () => process.env.APP_URL ?? "https://luxestore.com";
const FROM_NAME = () => process.env.RESEND_FROM_NAME ?? "LUXE Store";
const FROM_EMAIL = () => process.env.RESEND_FROM_EMAIL ?? "noreply@luxestore.com";
const FROM = () => `${FROM_NAME()} <${FROM_EMAIL()}>`;

function isConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!isConfigured()) {
    logger.warn({ to, subject }, "Email skipped — RESEND_API_KEY / RESEND_FROM_EMAIL not configured");
    return;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: FROM(), to, subject, html });
    if (result.error) throw new Error(result.error.message);
    logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Email send failed");
  }
}

const baseStyle = `
  font-family: Georgia, serif;
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  color: #1a1a1a;
`;
const headerStyle = `
  background: #0a0a0a;
  padding: 32px 40px;
  text-align: center;
`;
const bodyStyle = `padding: 40px;`;
const footerStyle = `
  background: #f5f5f5;
  padding: 24px 40px;
  text-align: center;
  font-size: 13px;
  color: #666;
`;
const btnStyle = `
  display: inline-block;
  background: #0a0a0a;
  color: #fff !important;
  text-decoration: none;
  padding: 14px 32px;
  font-size: 14px;
  letter-spacing: 1px;
  margin-top: 24px;
`;

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5">
  <div style="${baseStyle}">
    <div style="${headerStyle}">
      <h1 style="color:#d4af37;font-size:28px;letter-spacing:4px;margin:0;font-weight:400">LUXE</h1>
    </div>
    <div style="${bodyStyle}">${body}</div>
    <div style="${footerStyle}">
      <p style="margin:0">© ${new Date().getFullYear()} LUXE Fashion. All rights reserved.</p>
      <p style="margin:8px 0 0">You received this email because you have an account with LUXE.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const url = `${APP_URL()}/verify-email?token=${token}`;
  await send(email, "Verify your LUXE account", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Welcome, ${name}</h2>
    <p style="line-height:1.7;color:#444">Thank you for joining LUXE. Please verify your email address to complete your registration.</p>
    <div style="text-align:center">
      <a href="${url}" style="${btnStyle}">VERIFY EMAIL</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  `));
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const url = `${APP_URL()}/reset-password?token=${token}`;
  await send(email, "Reset your LUXE password", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Password Reset</h2>
    <p style="line-height:1.7;color:#444">Hi ${name}, we received a request to reset your password. Click the button below to set a new password.</p>
    <div style="text-align:center">
      <a href="${url}" style="${btnStyle}">RESET PASSWORD</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">This link expires in 60 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
  `));
}

export async function sendOrderConfirmationEmail(
  email: string,
  name: string,
  orderId: number,
  total: number,
  items: Array<{ nameEn: string; quantity: number; price: number }>
): Promise<void> {
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${i.nameEn}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  await send(email, `Order Confirmed — #${orderId}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px">Order Confirmed</h2>
    <p style="color:#888;margin:0 0 24px">Order #${orderId}</p>
    <p style="line-height:1.7;color:#444">Hi ${name}, thank you for your order! We'll notify you when it ships.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0">
      <thead>
        <tr style="border-bottom:2px solid #0a0a0a">
          <th style="text-align:left;padding:8px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase">Item</th>
          <th style="text-align:center;padding:8px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase">Qty</th>
          <th style="text-align:right;padding:8px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 0;font-weight:bold">Total</td>
          <td style="padding:12px 0;font-weight:bold;text-align:right">$${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="text-align:center">
      <a href="${APP_URL()}/dashboard/customer" style="${btnStyle}">TRACK YOUR ORDER</a>
    </div>
  `));
}

export async function sendOrderStatusEmail(
  email: string,
  name: string,
  orderId: number,
  status: string
): Promise<void> {
  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed and is being prepared.",
    processing: "Your order is currently being processed.",
    shipped: "Great news — your order has shipped and is on its way!",
    delivered: "Your order has been delivered. We hope you love it!",
    cancelled: "Your order has been cancelled. If you have questions, please contact us.",
  };
  const message = statusMessages[status] ?? `Your order status has been updated to: ${status}.`;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  await send(email, `Order ${statusLabel} — #${orderId}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px">Order Update</h2>
    <p style="color:#888;margin:0 0 24px">Order #${orderId} — ${statusLabel}</p>
    <p style="line-height:1.7;color:#444">Hi ${name},</p>
    <p style="line-height:1.7;color:#444">${message}</p>
    <div style="text-align:center">
      <a href="${APP_URL()}/dashboard/customer" style="${btnStyle}">VIEW ORDER</a>
    </div>
  `));
}

export async function sendVendorNewOrderEmail(
  vendorEmail: string,
  vendorName: string,
  orderId: number,
  itemCount: number,
  total: number
): Promise<void> {
  await send(vendorEmail, `New Order Received — #${orderId}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">New Order</h2>
    <p style="line-height:1.7;color:#444">Hi ${vendorName}, you have received a new order!</p>
    <div style="background:#f9f9f9;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Order:</strong> #${orderId}</p>
      <p style="margin:0 0 8px"><strong>Items:</strong> ${itemCount}</p>
      <p style="margin:0"><strong>Total:</strong> $${total.toFixed(2)}</p>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL()}/dashboard/vendor" style="${btnStyle}">VIEW ORDER</a>
    </div>
  `));
}

export async function sendNewLoginEmail(opts: {
  email: string;
  name: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  time: Date;
}): Promise<void> {
  const timeStr = opts.time.toUTCString();
  const securityUrl = `${APP_URL()}/dashboard/customer?tab=security&alert=1`;
  await send(opts.email, "New sign-in to your LUXE account", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">New Sign-In Detected</h2>
    <p style="line-height:1.7;color:#444">Hi ${opts.name}, we noticed a new sign-in to your LUXE account from a device we haven't seen before.</p>
    <div style="background:#f9f9f9;padding:20px;margin:20px 0;border-left:3px solid #d4af37">
      <p style="margin:0 0 8px"><strong>Device:</strong> ${opts.deviceName}</p>
      <p style="margin:0 0 8px"><strong>Browser:</strong> ${opts.browser}</p>
      <p style="margin:0 0 8px"><strong>Operating System:</strong> ${opts.os}</p>
      <p style="margin:0 0 8px"><strong>IP Address:</strong> ${opts.ip}</p>
      <p style="margin:0"><strong>Time:</strong> ${timeStr}</p>
    </div>
    <p style="line-height:1.7;color:#444">If this was you, no action is needed — this device is now trusted.</p>
    <p style="line-height:1.7;color:#444">If you don't recognise this sign-in, secure your account immediately:</p>
    <div style="text-align:center">
      <a href="${securityUrl}" style="${btnStyle}">THIS WASN'T ME — SECURE ACCOUNT</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">If you're unable to access your account, please contact our support team. You can also turn off these alerts in your account Security settings.</p>
  `));
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await send(email, `Welcome to LUXE, ${name}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Welcome to LUXE</h2>
    <p style="line-height:1.7;color:#444">Hi ${name}, your account has been created successfully.</p>
    <p style="line-height:1.7;color:#444">Discover our curated collection of premium fashion and accessories.</p>
    <div style="text-align:center">
      <a href="${APP_URL()}/products" style="${btnStyle}">SHOP NOW</a>
    </div>
  `));
}
