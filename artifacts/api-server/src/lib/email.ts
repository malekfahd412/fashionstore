import { logger } from "./logger";

const APP_URL = () => process.env.APP_URL ?? "https://luxestore.com";
const FROM_NAME = () => process.env.RESEND_FROM_NAME ?? "Velora Store";
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
      <h1 style="color:#d4af37;font-size:28px;letter-spacing:4px;margin:0;font-weight:400">Velora</h1>
    </div>
    <div style="${bodyStyle}">${body}</div>
    <div style="${footerStyle}">
      <p style="margin:0">© ${new Date().getFullYear()} Velora. All rights reserved.</p>
      <p style="margin:8px 0 0">You received this email because you have an account with Velora.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const url = `${APP_URL()}/verify-email?token=${token}`;
  await send(email, "Verify your Velora account", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Welcome, ${name}</h2>
    <p style="line-height:1.7;color:#444">Thank you for joining Velora. Please verify your email address to complete your registration.</p>
    <div style="text-align:center">
      <a href="${url}" style="${btnStyle}">VERIFY EMAIL</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  `));
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const url = `${APP_URL()}/reset-password?token=${token}`;
  await send(email, "Reset your Velora password", wrap(`
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
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${(i.price * i.quantity).toFixed(2)} EGP</td>
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
          <td style="padding:12px 0;font-weight:bold;text-align:right">${total.toFixed(2)} EGP</td>
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
      <p style="margin:0"><strong>Total:</strong> ${total.toFixed(2)} EGP</p>
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
  location?: string;
  time: Date;
}): Promise<void> {
  const timeStr = opts.time.toUTCString();
  const securityUrl = `${APP_URL()}/dashboard/customer?tab=security&alert=1`;
  const locationRow = opts.location
    ? `<p style="margin:0 0 8px"><strong>Approximate Location:</strong> ${opts.location}</p>`
    : "";
  await send(opts.email, "New sign-in to your Velora account", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">New Sign-In Detected</h2>
    <p style="line-height:1.7;color:#444">Hi ${opts.name}, we noticed a new sign-in to your Velora account from a device we haven't seen before.</p>
    <div style="background:#f9f9f9;padding:20px;margin:20px 0;border-left:3px solid #d4af37">
      <p style="margin:0 0 8px"><strong>Time:</strong> ${timeStr}</p>
      ${locationRow}
      <p style="margin:0 0 8px"><strong>Device:</strong> ${opts.deviceName}</p>
      <p style="margin:0 0 8px"><strong>Browser:</strong> ${opts.browser}</p>
      <p style="margin:0 0 8px"><strong>Operating System:</strong> ${opts.os}</p>
      <p style="margin:0"><strong>IP Address:</strong> ${opts.ip}</p>
    </div>
    <p style="line-height:1.7;color:#444">If this was you, no action is needed — this device is now trusted.</p>
    <p style="line-height:1.7;color:#444">If you don't recognise this sign-in, secure your account immediately:</p>
    <div style="text-align:center">
      <a href="${securityUrl}" style="${btnStyle}">THIS WASN'T ME — SECURE ACCOUNT</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">If you're unable to access your account, please contact our support team. You can also turn off these alerts in your account Security settings.</p>
  `));
}

export async function sendForcePasswordResetEmail(opts: {
  email: string;
  name: string;
  resetUrl: string;
  suspiciousIp: string;
  loginTime: Date;
  location?: string;
}): Promise<void> {
  const timeStr = opts.loginTime.toUTCString();
  const locationRow = opts.location
    ? `<p style="margin:0 0 8px"><strong>Approximate Location:</strong> ${opts.location}</p>`
    : "";
  await send(opts.email, "⚠️ Your Velora account password must be reset", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px;color:#b91c1c">Security Alert: Forced Password Reset</h2>
    <p style="line-height:1.7;color:#444">Hi ${opts.name},</p>
    <p style="line-height:1.7;color:#444">Our security team detected a sign-in to your account that matches a known credential-stuffing attack. As a precaution, your password has been reset and all active sessions have been terminated.</p>
    <div style="background:#fff5f5;padding:20px;margin:20px 0;border-left:3px solid #b91c1c">
      <p style="margin:0 0 4px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#b91c1c">Suspicious Login Details</p>
      <p style="margin:8px 0 8px"><strong>Time:</strong> ${timeStr}</p>
      ${locationRow}
      <p style="margin:0 0 8px"><strong>IP Address:</strong> ${opts.suspiciousIp}</p>
      <p style="margin:0;font-size:12px;color:#666">This IP was also used to attack other accounts, suggesting your password was obtained in a data breach.</p>
    </div>
    <p style="line-height:1.7;color:#444">To regain access to your account, click the button below to set a new password. This link expires in <strong>60 minutes</strong>.</p>
    <div style="text-align:center">
      <a href="${opts.resetUrl}" style="${btnStyle}">RESET MY PASSWORD</a>
    </div>
    <p style="line-height:1.7;color:#444;margin-top:24px">Once you have reset your password, we recommend:</p>
    <ul style="color:#444;line-height:2;padding-left:20px">
      <li>Use a unique password not used on any other site</li>
      <li>Enable two-factor authentication if available</li>
      <li>Check for any unauthorised orders or profile changes</li>
    </ul>
    <p style="font-size:12px;color:#999;margin-top:24px">If you need help, contact our support team immediately. Do not share this link with anyone.</p>
  `));
}

export async function sendPaymentSuccessEmail(
  email: string,
  name: string,
  orderId: number,
  total: number,
  method: string
): Promise<void> {
  const methodLabel = method === "card" ? "Credit / Debit Card"
    : method === "meeza" ? "Meeza Card"
    : method === "vodafone" ? "Vodafone Cash"
    : method;
  await send(email, `Payment Received — Order #${orderId}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px">Payment Successful</h2>
    <p style="color:#888;margin:0 0 24px">Order #${orderId}</p>
    <p style="line-height:1.7;color:#444">Hi ${name}, your payment has been received and confirmed.</p>
    <div style="background:#f9f9f9;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Order:</strong> #${orderId}</p>
      <p style="margin:0 0 8px"><strong>Payment Method:</strong> ${methodLabel}</p>
      <p style="margin:0"><strong>Amount Paid:</strong> ${total.toFixed(2)} EGP</p>
    </div>
    <p style="line-height:1.7;color:#444">We're now processing your order and will notify you when it ships.</p>
    <div style="text-align:center">
      <a href="${APP_URL()}/dashboard/customer" style="${btnStyle}">TRACK YOUR ORDER</a>
    </div>
  `));
}

export async function sendPaymentFailedEmail(
  email: string,
  name: string,
  orderId: number,
  total: number
): Promise<void> {
  await send(email, `Payment Failed — Order #${orderId}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px;color:#b91c1c">Payment Failed</h2>
    <p style="color:#888;margin:0 0 24px">Order #${orderId}</p>
    <p style="line-height:1.7;color:#444">Hi ${name}, unfortunately your payment of <strong>${total.toFixed(2)} EGP</strong> for order #${orderId} could not be processed.</p>
    <p style="line-height:1.7;color:#444">Your order has been placed but payment is still pending. Please try paying again or use a different payment method.</p>
    <div style="background:#fff5f5;padding:20px;margin:20px 0;border-left:3px solid #b91c1c">
      <p style="margin:0;font-size:14px;color:#b91c1c">Common reasons: insufficient funds, card declined, or session timeout.</p>
    </div>
    <div style="text-align:center">
      <a href="${APP_URL()}/cart" style="${btnStyle}">TRY AGAIN</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">If you continue to experience issues, please contact our support team.</p>
  `));
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await send(email, `Welcome to Velora, ${name}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Welcome to Velora</h2>
    <p style="line-height:1.7;color:#444">Hi ${name}, your account has been created successfully.</p>
    <p style="line-height:1.7;color:#444">Discover our curated collection of premium fashion and accessories.</p>
    <div style="text-align:center">
      <a href="${APP_URL()}/products" style="${btnStyle}">SHOP NOW</a>
    </div>
  `));
}

export async function sendContactConfirmation(to: string, name: string, messageSnippet: string): Promise<void> {
  await send(to, "We received your message — Velora", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Message Received</h2>
    <p style="line-height:1.7;color:#444">Hi ${name}, thank you for contacting Velora.</p>
    <p style="line-height:1.7;color:#444">We've received your message and will get back to you within 1–2 business days.</p>
    <div style="background:#f9f9f9;padding:16px 20px;margin:20px 0;border-left:3px solid #d4af37;font-style:italic;color:#666">
      "${messageSnippet}"
    </div>
    <div style="text-align:center">
      <a href="${APP_URL()}/faq" style="${btnStyle}">BROWSE FAQs</a>
    </div>
  `));
}

export async function sendContactAdminNotification(adminEmail: string, from: { name: string; email: string; phone?: string | null; subject?: string | null; message: string }): Promise<void> {
  await send(adminEmail, `New Contact Message: ${from.subject ?? "(no subject)"}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">New Contact Message</h2>
    <div style="background:#f9f9f9;padding:20px;margin:16px 0">
      <p style="margin:0 0 8px"><strong>Name:</strong> ${from.name}</p>
      <p style="margin:0 0 8px"><strong>Email:</strong> ${from.email}</p>
      ${from.phone ? `<p style="margin:0 0 8px"><strong>Phone:</strong> ${from.phone}</p>` : ""}
      <p style="margin:0"><strong>Subject:</strong> ${from.subject ?? "(none)"}</p>
    </div>
    <div style="border:1px solid #eee;padding:20px;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#444">${from.message}</div>
    <div style="text-align:center;margin-top:24px">
      <a href="${APP_URL()}/admin-panel" style="${btnStyle}">VIEW IN ADMIN</a>
    </div>
  `));
}

export async function sendContactReply(to: string, name: string, replyMessage: string): Promise<void> {
  await send(to, `Re: Your message to ${FROM_NAME()}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Hi ${name},</h2>
    <p style="line-height:1.7;color:#444">Thank you for reaching out to us. Here is our response to your inquiry:</p>
    <div style="border-left:3px solid #065f46;padding:12px 16px;background:#f9f9f9;margin:16px 0;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#444">${replyMessage}</div>
    <p style="line-height:1.7;color:#444">If you have further questions, please don't hesitate to contact us again.</p>
    <div style="text-align:center;margin-top:24px">
      <a href="${APP_URL()}/contact" style="${btnStyle}">CONTACT US AGAIN</a>
    </div>
  `));
}

export async function sendSupportTicketConfirmationEmail(
  email: string,
  name: string,
  ticket: { id: number; subject: string; category: string },
): Promise<void> {
  const ticketUrl = `${APP_URL()}/dashboard/customer?tab=support&ticket=${ticket.id}`;
  const categoryLabel = ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1);
  await send(email, `We received your support ticket — #${ticket.id}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px">We've received your ticket</h2>
    <p style="color:#888;margin:0 0 24px">Ticket #${ticket.id}</p>
    <p style="line-height:1.7;color:#444">Hi ${name}, thank you for reaching out. Our support team has received your ticket and will respond as soon as possible, typically within 1–2 business days.</p>
    <div style="background:#f9f9f9;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Ticket ID:</strong> #${ticket.id}</p>
      <p style="margin:0 0 8px"><strong>Subject:</strong> ${ticket.subject}</p>
      <p style="margin:0"><strong>Category:</strong> ${categoryLabel}</p>
    </div>
    <p style="line-height:1.7;color:#444">You'll receive another email as soon as we reply. You can also check your ticket status and add more details from your dashboard at any time.</p>
    <div style="text-align:center">
      <a href="${ticketUrl}" style="${btnStyle}">VIEW MY TICKET</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">Please do not reply to this email. Use your dashboard to add messages to your ticket.</p>
  `));
}

export async function sendSupportNewTicketAdminEmail(
  adminEmail: string,
  ticket: { id: number; subject: string; category: string; message: string },
  customer: { name: string; email: string },
): Promise<void> {
  const ticketUrl = `${APP_URL()}/admin-panel?tab=support`;
  const categoryLabel = ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1);
  await send(adminEmail, `New Support Ticket #${ticket.id}: ${ticket.subject}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px">New Support Ticket</h2>
    <p style="color:#888;margin:0 0 24px">Ticket #${ticket.id}</p>
    <p style="line-height:1.7;color:#444">A customer has opened a new support ticket that requires your attention.</p>
    <div style="background:#f9f9f9;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Ticket ID:</strong> #${ticket.id}</p>
      <p style="margin:0 0 8px"><strong>Subject:</strong> ${ticket.subject}</p>
      <p style="margin:0 0 8px"><strong>Category:</strong> ${categoryLabel}</p>
      <p style="margin:0 0 8px"><strong>Customer:</strong> ${customer.name}</p>
      <p style="margin:0"><strong>Customer Email:</strong> ${customer.email}</p>
    </div>
    <div style="border-left:3px solid #d4af37;padding:12px 16px;background:#fffdf0;margin:0 0 24px;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#444">${ticket.message}</div>
    <div style="text-align:center">
      <a href="${ticketUrl}" style="${btnStyle}">REPLY IN ADMIN PANEL</a>
    </div>
  `));
}

export async function sendSupportTicketReplyEmail(
  email: string,
  name: string,
  ticketId: number,
  ticketSubject: string,
  replyMessage: string,
): Promise<void> {
  const ticketUrl = `${APP_URL()}/dashboard/customer?tab=support&ticket=${ticketId}`;
  await send(email, `Re: [Ticket #${ticketId}] ${ticketSubject}`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 8px">Support Reply</h2>
    <p style="color:#888;margin:0 0 24px">Ticket #${ticketId} — ${ticketSubject}</p>
    <p style="line-height:1.7;color:#444">Hi ${name}, our support team has replied to your support ticket.</p>
    <div style="border-left:3px solid #065f46;padding:12px 16px;background:#f9f9f9;margin:20px 0;white-space:pre-wrap;font-size:14px;line-height:1.7;color:#444">${replyMessage}</div>
    <p style="line-height:1.7;color:#444">You can view the full conversation and reply directly from your dashboard.</p>
    <div style="text-align:center">
      <a href="${ticketUrl}" style="${btnStyle}">VIEW TICKET</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:24px">If this issue has been resolved, you can close the ticket from your dashboard.</p>
  `));
}

export async function sendAbandonedCartEmail(
  email: string,
  name: string,
  itemCount: number,
  cartUrl: string,
): Promise<void> {
  await send(email, `You left something behind — Complete your order`, wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Your cart is waiting, ${name}</h2>
    <p style="line-height:1.7;color:#444">You have ${itemCount} item${itemCount !== 1 ? "s" : ""} saved in your cart. Don't miss out — your items are still available but may sell out.</p>
    <div style="text-align:center">
      <a href="${cartUrl}" style="${btnStyle}">COMPLETE MY ORDER</a>
    </div>
    <p style="line-height:1.7;color:#999;font-size:13px;margin-top:24px">This is a one-time reminder. We won't send you further cart reminders for this session.</p>
  `));
}

export async function sendNewsletterWelcome(to: string, unsubscribeToken: string): Promise<void> {
  const unsubUrl = `${APP_URL()}/newsletter/unsubscribe?token=${unsubscribeToken}`;
  await send(to, "Welcome to Velora — You're subscribed!", wrap(`
    <h2 style="font-size:22px;font-weight:400;margin:0 0 16px">Welcome to Velora</h2>
    <p style="line-height:1.7;color:#444">Thank you for subscribing to Velora updates. You'll be the first to know about new arrivals, exclusive sales, and fashion inspiration.</p>
    <div style="text-align:center">
      <a href="${APP_URL()}/products" style="${btnStyle}">SHOP NEW ARRIVALS</a>
    </div>
    <p style="font-size:12px;color:#999;margin-top:32px;text-align:center">
      Don't want these emails? <a href="${unsubUrl}" style="color:#666">Unsubscribe here</a>.
    </p>
  `));
}
