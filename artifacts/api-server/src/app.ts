import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// ── Environment validation ────────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "SESSION_SECRET"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── CORS configuration ────────────────────────────────────────────────────
//
// Strategy:
//   Development  → Replit preview/dev URLs are always allowed (matched by
//                  broad regex); ALLOWED_ORIGINS is additive.
//   Production   → Only exact origins listed in ALLOWED_ORIGINS are allowed
//                  (plus Replit deployment domains by regex).
//
// Replit URL formats observed in the wild:
//   Preview  : https://<hash>.<user>.replit.dev   (multi-segment subdomain)
//   Legacy   : https://<name>.<user>.repl.co
//   Deployed : https://<name>.<user>.replit.app
//   Custom   : anything the operator adds to ALLOWED_ORIGINS

const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_DEV = NODE_ENV !== "production";

/**
 * Parse a comma-separated ALLOWED_ORIGINS string into a clean list of origins.
 * Trims whitespace, removes empty entries, strips trailing slashes.
 */
function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(s => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const customOrigins: string[] = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

// Patterns that always match regardless of NODE_ENV.
// Using (.+\.)? so both single- and multi-level subdomains are accepted:
//   e.g. abc.replit.dev  ✓
//        abc.xyz.replit.dev  ✓  (actual Replit format: hash.user.replit.dev)
const REPLIT_PATTERNS: RegExp[] = [
  /^https?:\/\/(.+\.)?replit\.dev$/,
  /^https?:\/\/(.+\.)?repl\.co$/,
  /^https?:\/\/(.+\.)?replit\.app$/,
];

// Local patterns — only in development
const LOCAL_PATTERNS: RegExp[] = IS_DEV
  ? [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/0\.0\.0\.0(:\d+)?$/,
    ]
  : [];

// ── Startup diagnostics ───────────────────────────────────────────────────
logger.info(
  {
    NODE_ENV,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? "(not set)",
    parsedCustomOrigins: customOrigins,
    replitPatternsCount: REPLIT_PATTERNS.length,
    localPatternsEnabled: IS_DEV,
  },
  "CORS startup diagnostics",
);

// ── CORS helper ───────────────────────────────────────────────────────────
function isOriginAllowed(origin: string): boolean {
  // Normalise: strip trailing slash for comparison
  const normalised = origin.replace(/\/+$/, "");

  // 1. Custom exact-match origins (from ALLOWED_ORIGINS)
  if (customOrigins.some(o => o === normalised)) return true;

  // 2. Replit URL patterns (always allowed)
  if (REPLIT_PATTERNS.some(re => re.test(normalised))) return true;

  // 3. Local patterns (development only)
  if (LOCAL_PATTERNS.some(re => re.test(normalised))) return true;

  return false;
}

// Export so the healthz route can report the count without re-computing
export const corsConfig = {
  get allowedOriginsCount() {
    return customOrigins.length + REPLIT_PATTERNS.length + LOCAL_PATTERNS.length;
  },
  get customOrigins() {
    return customOrigins;
  },
  currentEnvironment: NODE_ENV,
  corsEnabled: true,
};

const app: Express = express();

// Trust the first proxy (Replit's reverse proxy) so express-rate-limit can
// read X-Forwarded-For accurately without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ── Security headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// ── CORS middleware ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      // No origin header → same-origin or server-to-server (Vite proxy) — allow
      if (!origin) return cb(null, true);

      if (isOriginAllowed(origin)) {
        return cb(null, true);
      }

      // Log the rejection with full context so operators can diagnose quickly
      logger.warn(
        {
          requestOrigin: origin,
          customOrigins,
          replitPatterns: REPLIT_PATTERNS.map(r => r.source),
          localPatternsEnabled: IS_DEV,
          NODE_ENV,
          reason: "Origin did not match any allowed pattern or exact-match entry",
        },
        "CORS: origin rejected",
      );

      // Return 403, not 500. We signal 403 by attaching .status to the error
      // so the global error handler picks it up correctly.
      const err = new Error("Origin not allowed") as Error & { status: number };
      err.status = 403;
      return cb(err);
    },
    credentials: true,
  })
);

// ── Compression ────────────────────────────────────────────────────────────
app.use(compression());

// ── Logging (safe pino usage) ──────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Rate limiting ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) return `checkout:${auth.slice(7, 30)}`;

    const ip = (req.ip ?? "unknown").replace(/^::ffff:/, "");
    return ip;
  },
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Too many orders placed. Please wait before trying again." },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/orders", checkoutLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  try {
    if (req?.log?.error) {
      req.log.error({ err }, "Unhandled error");
    } else {
      logger.error({ err }, "Unhandled error");
    }

    const status =
      typeof err?.status === "number"
        ? err.status
        : 500;

    // In production, hide internal details except for client errors (4xx)
    const exposeMessage = status < 500 || process.env.NODE_ENV !== "production";
    const message = exposeMessage
      ? err?.message || "Unknown error"
      : "Internal server error";

    res.status(status).json({ error: message });
    return;
  } catch (fatalError) {
    logger.error({ fatalError }, "Critical error in error handler");
    res.status(500).json({ error: "Critical server error" });
    return;
  }
});

export default app;
