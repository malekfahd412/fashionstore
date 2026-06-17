import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapFirstAdmin } from "./bootstrap/firstAdmin";

// ── Optional environment variable check ────────────────────────────────────────
// These vars are not required to start but unlock specific features.
// Log a clear warning at startup so operators know what's missing.
const OPTIONAL_ENV: Array<{ key: string; feature: string }> = [
  { key: "RESEND_API_KEY",           feature: "email delivery" },
  { key: "RESEND_FROM_EMAIL",        feature: "email delivery" },
  { key: "GOOGLE_CLIENT_ID",         feature: "Google sign-in" },
  { key: "PAYMOB_API_KEY",           feature: "Paymob payments" },
  { key: "PAYMOB_HMAC_SECRET",       feature: "Paymob webhook verification" },
  { key: "CLOUDINARY_CLOUD_NAME",    feature: "image uploads" },
  { key: "CLOUDINARY_API_KEY",       feature: "image uploads" },
  { key: "CLOUDINARY_API_SECRET",    feature: "image uploads" },
  { key: "WHATSAPP_ACCESS_TOKEN",    feature: "WhatsApp notifications" },
  { key: "WHATSAPP_PHONE_NUMBER_ID", feature: "WhatsApp notifications" },
];

const missing = OPTIONAL_ENV.filter(({ key }) => !process.env[key]);
if (missing.length > 0) {
  logger.warn(
    { missing: missing.map(m => m.key) },
    `${missing.length} optional env var(s) not set — some features will be disabled:\n` +
    missing.map(m => `  • ${m.key.padEnd(28)} (${m.feature})`).join("\n"),
  );
} else {
  logger.info("All optional env vars are configured");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Run first-admin bootstrap before accepting traffic
bootstrapFirstAdmin().catch((err) => {
  logger.error({ err }, "First-admin bootstrap failed — continuing without admin");
});

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received — closing server gracefully");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force exit after 10 s if connections linger
  setTimeout(() => {
    logger.warn("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});
