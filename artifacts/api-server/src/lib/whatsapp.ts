import { logger } from "./logger";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `+2${digits}`;
  if (digits.startsWith("2") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

function provider(): string {
  return (process.env.WHATSAPP_PROVIDER ?? "cloud").toLowerCase();
}

function isConfigured(): boolean {
  if (provider() === "twilio") {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    );
  }
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export function isWhatsAppEnabled(): boolean {
  return process.env.WHATSAPP_ENABLED === "true" && isConfigured();
}

async function sendCloud(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "text",
      text: { body, preview_url: false },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "unknown");
    throw new Error(`WhatsApp Cloud API error (${resp.status}): ${err}`);
  }
}

async function sendTwilio(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM!;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${normalizePhone(to)}`,
    Body: body,
  });
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "unknown");
    throw new Error(`Twilio WhatsApp error (${resp.status}): ${err}`);
  }
}

async function send(to: string | null | undefined, body: string): Promise<void> {
  if (!to || to.replace(/\D/g, "").length < 7) return;
  if (!isWhatsAppEnabled()) {
    logger.debug({ to }, "WhatsApp skipped — not configured or disabled");
    return;
  }
  try {
    if (provider() === "twilio") {
      await sendTwilio(to, body);
    } else {
      await sendCloud(to, body);
    }
    logger.info({ to }, "WhatsApp message sent");
  } catch (err) {
    logger.error({ err, to }, "WhatsApp send failed");
  }
}

const storeName = () => process.env.STORE_NAME ?? "Velora";
const appUrl = () => process.env.APP_URL ?? "";

export async function sendOrderPlacedWhatsApp(
  phone: string | null | undefined,
  orderId: number,
  total: number,
): Promise<void> {
  const url = appUrl() ? `\n\nTrack: ${appUrl()}/order/${orderId}/tracking` : "";
  await send(
    phone,
    `✅ *${storeName()}* — Order #${orderId} Confirmed!\n\nThank you for your order. Total: $${total.toFixed(2)}.${url}`,
  );
}

export async function sendPaymentApprovedWhatsApp(
  phone: string | null | undefined,
  orderId: number,
): Promise<void> {
  const url = appUrl() ? `\n\nTrack: ${appUrl()}/order/${orderId}/tracking` : "";
  await send(
    phone,
    `💳 *${storeName()}* — Payment Confirmed for Order #${orderId}\n\nYour payment has been received and we're preparing your order.${url}`,
  );
}

export async function sendOrderShippedWhatsApp(
  phone: string | null | undefined,
  orderId: number,
  trackingNote?: string | null,
): Promise<void> {
  const note = trackingNote ? `\nTracking: ${trackingNote}` : "";
  const url = appUrl() ? `\n\nTrack: ${appUrl()}/order/${orderId}/tracking` : "";
  await send(
    phone,
    `📦 *${storeName()}* — Order #${orderId} Has Shipped!\n\nYour order is on its way.${note}${url}`,
  );
}

export async function sendOrderDeliveredWhatsApp(
  phone: string | null | undefined,
  orderId: number,
): Promise<void> {
  const support = appUrl() ? `\n\nNeed help? ${appUrl()}/contact` : "";
  await send(
    phone,
    `🏠 *${storeName()}* — Order #${orderId} Delivered!\n\nYour order has arrived. Enjoy your purchase!${support}`,
  );
}

export async function sendSupportReplyWhatsApp(
  phone: string | null | undefined,
  ticketId: number,
  subject: string,
): Promise<void> {
  const url = appUrl()
    ? `\n\nView: ${appUrl()}/dashboard/customer?tab=support`
    : "";
  await send(
    phone,
    `💬 *${storeName()}* — Support Update\n\nTicket #${ticketId} "${subject}" has a new reply.${url}`,
  );
}

export async function sendAbandonedCartWhatsApp(
  phone: string | null | undefined,
  cartUrl: string,
): Promise<void> {
  await send(
    phone,
    `🛍️ *${storeName()}* — You left something behind!\n\nYour cart is waiting. Complete your order: ${cartUrl}`,
  );
}
