import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getLockedAccounts,
  getLoginHistory,
  getSuspiciousActivity,
  unlockAccount,
} from "../lib/loginProtection";

const router: IRouter = Router();

// ── GET /admin/security/locked-accounts ──────────────────────────────────────
router.get("/admin/security/locked-accounts", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const accounts = await getLockedAccounts();
  res.json({ accounts });
});

// ── GET /admin/security/login-history ────────────────────────────────────────
router.get("/admin/security/login-history", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const {
    email,
    ip,
    success,
    from,
    to,
    page = "1",
    limit = "50",
  } = req.query as Record<string, string>;

  const result = await getLoginHistory({
    email: email || undefined,
    ip: ip || undefined,
    success: success === "true" ? true : success === "false" ? false : undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.json(result);
});

// ── GET /admin/security/suspicious-activity ───────────────────────────────────
router.get("/admin/security/suspicious-activity", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const activity = await getSuspiciousActivity();
  res.json(activity);
});

// ── POST /admin/security/unlock ───────────────────────────────────────────────
router.post("/admin/security/unlock", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { email, ip } = req.body as { email?: string; ip?: string };
  if (!email && !ip) {
    res.status(400).json({ error: "Provide email or ip to unlock" });
    return;
  }
  await unlockAccount(email, ip);
  res.json({ message: "Account unlocked", email, ip });
});

export default router;
