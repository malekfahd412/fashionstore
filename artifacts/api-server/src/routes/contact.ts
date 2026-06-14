import { Router, type IRouter } from "express";
import { db, contactMessagesTable, storeSettingsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendContactConfirmation, sendContactAdminNotification, sendContactReply } from "../lib/email";

const router: IRouter = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/contact", async (req, res): Promise<void> => {
  const { name, email, phone, subject, message } = req.body ?? {};
  if (!name || typeof name !== "string" || name.trim().length < 1) {
    res.status(400).json({ error: "Name is required" }); return;
  }
  if (!email || !isValidEmail(String(email))) {
    res.status(400).json({ error: "Valid email is required" }); return;
  }
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    res.status(400).json({ error: "Message must be at least 5 characters" }); return;
  }
  const [msg] = await db.insert(contactMessagesTable).values({
    name: String(name).trim().slice(0, 200),
    email: String(email).trim(),
    phone: phone ? String(phone).trim().slice(0, 30) : null,
    subject: subject ? String(subject).trim().slice(0, 500) : null,
    message: String(message).trim().slice(0, 5000),
  }).returning();

  void (async () => {
    try {
      const settings = await db.select().from(storeSettingsTable).where(eq(storeSettingsTable.key, "contact_email"));
      const adminEmail = settings[0]?.value || process.env.RESEND_FROM_EMAIL;
      if (adminEmail) {
        await sendContactAdminNotification(adminEmail, {
          name: msg.name, email: msg.email, phone: msg.phone, subject: msg.subject, message: msg.message,
        });
      }
      await sendContactConfirmation(msg.email, msg.name, msg.message.slice(0, 200) + (msg.message.length > 200 ? "…" : ""));
    } catch { /* non-critical */ }
  })();

  res.status(201).json({ message: "Message sent successfully", id: msg.id });
});

router.get("/admin/contact-messages", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const [{ total }] = await db.select({ total: count() }).from(contactMessagesTable);
  const messages = await db.select().from(contactMessagesTable).orderBy(desc(contactMessagesTable.createdAt)).limit(limit).offset(offset);

  res.json({ messages, total: Number(total), page, limit });
});

router.patch("/admin/contact-messages/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body ?? {};
  if (!["new", "read", "replied"].includes(status)) {
    res.status(400).json({ error: "status must be new, read, or replied" }); return;
  }
  const [msg] = await db.update(contactMessagesTable).set({ status: String(status) }).where(eq(contactMessagesTable.id, id)).returning();
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(msg);
});

router.delete("/admin/contact-messages/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id));
  res.json({ message: "Message deleted" });
});

// ── Admin: reply to a contact message via email ──────────────────────────────
router.post("/admin/contact-messages/:id/reply", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { message } = req.body ?? {};
  if (!message || typeof message !== "string" || message.trim().length < 1) {
    res.status(400).json({ error: "Reply message is required" }); return;
  }
  const [msg] = await db.select().from(contactMessagesTable).where(eq(contactMessagesTable.id, id));
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

  await db.update(contactMessagesTable).set({ status: "replied" }).where(eq(contactMessagesTable.id, id));

  void (async () => {
    try { await sendContactReply(msg.email, msg.name, message.trim()); } catch { /* non-critical */ }
  })();

  res.json({ message: "Reply sent" });
});

export default router;
