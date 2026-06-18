const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export async function initSentry(): Promise<void> {
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
      integrations: [],
    });
  } catch {
  }
}
