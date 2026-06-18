import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { corsConfig } from "../app";
import { isCloudinaryConfigured } from "../lib/cloudinary";
import { isWhatsAppEnabled } from "../lib/whatsapp";

const router: IRouter = Router();
const startTime = Date.now();

function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID;
}

function isPaymobConfigured(): boolean {
  return !!process.env.PAYMOB_API_KEY;
}

function isPaymobHmacConfigured(): boolean {
  return !!process.env.PAYMOB_HMAC_SECRET;
}

router.get("/healthz", async (_req, res): Promise<void> => {
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = "error";
  }

  const uptimeMs = Date.now() - startTime;
  const status = dbStatus === "ok" ? "ok" : "degraded";

  const integrations = {
    email: {
      configured: isEmailConfigured(),
      provider: "resend",
      note: isEmailConfigured() ? null : "Set RESEND_API_KEY + RESEND_FROM_EMAIL to enable transactional email",
    },
    whatsapp: {
      configured: isWhatsAppEnabled(),
      provider: process.env.WHATSAPP_PROVIDER ?? "cloud",
      note: isWhatsAppEnabled() ? null : "Set WHATSAPP_ENABLED=true + provider credentials to enable WhatsApp",
    },
    cloudinary: {
      configured: isCloudinaryConfigured(),
      note: isCloudinaryConfigured() ? null : "Set CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET to enable image uploads",
    },
    google: {
      configured: isGoogleConfigured(),
      note: isGoogleConfigured() ? null : "Set GOOGLE_CLIENT_ID to enable Google OAuth login",
    },
    paymob: {
      apiKeyConfigured: isPaymobConfigured(),
      hmacConfigured: isPaymobHmacConfigured(),
      note: !isPaymobConfigured()
        ? "Set PAYMOB_API_KEY to enable Paymob payments"
        : !isPaymobHmacConfigured()
          ? "⚠️ PAYMOB_HMAC_SECRET not set — webhook verification disabled (required in production)"
          : null,
    },
  };

  res.status(dbStatus === "ok" ? 200 : 503).json({
    status,
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: Math.floor(uptimeMs / 1000),
    db: { status: dbStatus, latencyMs: dbLatencyMs },
    memory: {
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    cors: {
      corsEnabled: corsConfig.corsEnabled,
      allowedOriginsCount: corsConfig.allowedOriginsCount,
      currentEnvironment: corsConfig.currentEnvironment,
    },
    integrations,
    timestamp: new Date().toISOString(),
  });
});

export default router;
