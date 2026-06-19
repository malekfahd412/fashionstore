import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendNewsletterWelcome } from "../lib/email";
import crypto from "node:crypto";

const router: IRouter = Router();

const subscribeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many subscription attempts. Please try again later." },
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function genToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/newsletter/subscribe", subscribeRateLimiter, async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "Valid email required" }); return;
  }

  const existing = await db.select().from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.email, email));
  if (existing.length > 0) {
    if (existing[0].active) {
      res.status(409).json({ error: "Already subscribed" }); return;
    }
    const token = genToken();
    await db.update(newsletterSubscribersTable).set({ active: true, unsubscribeToken: token }).where(eq(newsletterSubscribersTable.email, email));
    void sendNewsletterWelcome(email, token);
    res.json({ message: "Resubscribed successfully" }); return;
  }

  const token = genToken();
  const [sub] = await db.insert(newsletterSubscribersTable).values({ email, unsubscribeToken: token }).returning();
  void sendNewsletterWelcome(email, token);
  res.status(201).json({ message: "Subscribed successfully", subscriber: sub });
});

router.post("/newsletter/unsubscribe", async (req, res): Promise<void> => {
  const { token, email } = req.body ?? {};

  if (token) {
    const rows = await db.select().from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.unsubscribeToken, String(token)));
    if (!rows.length) { res.status(404).json({ error: "Token not found" }); return; }
    await db.update(newsletterSubscribersTable).set({ active: false }).where(eq(newsletterSubscribersTable.unsubscribeToken, String(token)));
    res.json({ message: "Unsubscribed successfully" }); return;
  }

  if (email && isValidEmail(String(email))) {
    await db.update(newsletterSubscribersTable).set({ active: false }).where(eq(newsletterSubscribersTable.email, String(email)));
    res.json({ message: "Unsubscribed successfully" }); return;
  }

  res.status(400).json({ error: "Provide token or email" });
});

router.get("/admin/newsletter/subscribers", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(newsletterSubscribersTable);
  const subscribers = await db.select().from(newsletterSubscribersTable).orderBy(desc(newsletterSubscribersTable.subscribedAt)).limit(limit).offset(offset);

  res.json({ subscribers, total: Number(total), page, limit });
});

router.delete("/admin/newsletter/subscribers/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.id, id));
  res.json({ message: "Subscriber deleted" });
});

export default router;
