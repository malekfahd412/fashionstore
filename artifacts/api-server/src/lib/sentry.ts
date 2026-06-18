import { logger } from "./logger";

let sentryInitialized = false;

export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("SENTRY_DSN not set — Sentry error tracking disabled");
    return;
  }
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
      beforeSend(event) {
        if (process.env.NODE_ENV !== "production") return event;
        if (event.request?.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
        }
        return event;
      },
    });
    sentryInitialized = true;
    logger.info("Sentry initialized");
  } catch (err) {
    logger.warn({ err }, "Sentry initialization failed — error tracking disabled");
  }
}

export function getSentryHandlers() {
  if (!sentryInitialized) return { requestHandler: null, errorHandler: null };
  try {
    const Sentry = require("@sentry/node");
    return {
      requestHandler: Sentry.Handlers?.requestHandler?.() ?? null,
      errorHandler: Sentry.Handlers?.errorHandler?.() ?? null,
    };
  } catch {
    return { requestHandler: null, errorHandler: null };
  }
}

export function captureException(err: unknown): void {
  if (!sentryInitialized) return;
  try {
    const Sentry = require("@sentry/node");
    Sentry.captureException(err);
  } catch { }
}
