import { Router, type IRouter } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "Valid email required" }); return;
  }

  const existing = await db.select().from(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.email, email));
  if (existing.length > 0) {
    if (existing[0].active) {
      res.status(409).json({ error: "Already subscribed" }); return;
    }
    await db.update(newsletterSubscribersTable).set({ active: true }).where(eq(newsletterSubscribersTable.email, email));
    res.json({ message: "Resubscribed successfully" }); return;
  }

  const [sub] = await db.insert(newsletterSubscribersTable).values({ email }).returning();
  res.status(201).json({ message: "Subscribed successfully", subscriber: sub });
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
