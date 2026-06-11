import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { corsConfig } from "../app";

const router: IRouter = Router();
const startTime = Date.now();

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
    timestamp: new Date().toISOString(),
  });
});

export default router;
