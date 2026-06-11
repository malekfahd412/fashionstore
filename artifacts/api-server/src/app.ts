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

const app: Express = express();

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

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins: (string | RegExp)[] = [
  ...(process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  /^https?:\/\/[a-z0-9-]+\.replit\.dev$/,
  /^https?:\/\/[a-z0-9-]+\.repl\.co$/,
  /^https?:\/\/[a-z0-9-]+\.replit\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const allowed = allowedOrigins.some(o =>
        typeof o === "string" ? o === origin : o.test(origin)
      );

      if (allowed) return cb(null, true);

      return cb(new Error("CORS: origin not allowed"));
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

// ── GLOBAL ERROR HANDLER (FIXED) ──────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  try {
    // safe fallback logger (prevents undefined crash)
    if (req?.log?.error) {
      req.log.error({ err }, "Unhandled error");
    } else {
      logger.error({ err }, "Unhandled error");
    }

    const status =
      typeof err?.status === "number"
        ? err.status
        : 500;

    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err?.message || "Unknown error";

    return res.status(status).json({
      error: message,
    });
  } catch (fatalError) {
    // absolute safety net
    logger.error({ fatalError }, "Critical error in error handler");

    return res.status(500).json({
      error: "Critical server error",
    });
  }
});

export default app;