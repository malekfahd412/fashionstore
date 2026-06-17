import { Router, type IRouter } from "express";
import {
  db,
  supportTicketsTable,
  ticketMessagesTable,
  usersTable,
  userAddressesTable,
  storeSettingsTable,
} from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendSupportReplyWhatsApp } from "../lib/whatsapp";
import { sendSupportTicketReplyEmail, sendSupportNewTicketAdminEmail } from "../lib/email";

const router: IRouter = Router();

const VALID_STATUSES = ["open", "in_progress", "waiting_customer", "waiting_admin", "resolved", "closed"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];
const VALID_CATEGORIES = ["general", "order", "payment", "shipping", "returns", "account", "other"];

async function getUserPhone(userId: number): Promise<string | null> {
  const [addr] = await db
    .select({ phone: userAddressesTable.phone })
    .from(userAddressesTable)
    .where(eq(userAddressesTable.userId, userId))
    .limit(1);
  return addr?.phone ?? null;
}

// ── Customer: list my tickets ────────────────────────────────────────────────
router.get("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, userId))
    .orderBy(desc(supportTicketsTable.updatedAt));
  res.json(tickets);
});

// ── Customer: open new ticket ────────────────────────────────────────────────
router.post("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const { subject, category = "general", message, orderId } = req.body ?? {};
  if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
    res.status(400).json({ error: "Subject must be at least 3 characters" }); return;
  }
  if (!message || typeof message !== "string" || message.trim().length < 10) {
    res.status(400).json({ error: "Message must be at least 10 characters" }); return;
  }
  if (!VALID_CATEGORIES.includes(String(category))) {
    res.status(400).json({ error: "Invalid category" }); return;
  }

  const orderIdNum = orderId ? Number(orderId) : null;

  const [ticket] = await db.insert(supportTicketsTable).values({
    userId,
    orderId: orderIdNum && !isNaN(orderIdNum) ? orderIdNum : null,
    subject: subject.trim().slice(0, 255),
    category: String(category),
    status: "open",
    priority: "normal",
  }).returning();

  await db.insert(ticketMessagesTable).values({
    ticketId: ticket.id,
    senderId: userId,
    message: message.trim().slice(0, 5000),
    isInternal: false,
  });

  // Notify admin via email (non-blocking)
  void (async () => {
    const [setting] = await db
      .select({ value: storeSettingsTable.value })
      .from(storeSettingsTable)
      .where(eq(storeSettingsTable.key, "contact_email"))
      .limit(1);
    const adminEmail = setting?.value || process.env.RESEND_FROM_EMAIL;
    if (adminEmail) {
      const [customer] = await db
        .select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (customer) {
        await sendSupportNewTicketAdminEmail(
          adminEmail,
          { id: ticket.id, subject: ticket.subject, category: ticket.category, message: message.trim() },
          { name: customer.name ?? "Customer", email: customer.email },
        );
      }
    }
  })();

  res.status(201).json(ticket);
});

// ── Customer: get single ticket with messages ────────────────────────────────
router.get("/support/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (!isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const messagesQuery = db
    .select({
      id: ticketMessagesTable.id,
      ticketId: ticketMessagesTable.ticketId,
      senderId: ticketMessagesTable.senderId,
      message: ticketMessagesTable.message,
      isInternal: ticketMessagesTable.isInternal,
      createdAt: ticketMessagesTable.createdAt,
      senderName: usersTable.name,
      senderRole: usersTable.role,
    })
    .from(ticketMessagesTable)
    .leftJoin(usersTable, eq(ticketMessagesTable.senderId, usersTable.id))
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(ticketMessagesTable.createdAt);

  const allMessages = await messagesQuery;
  // Customers cannot see internal notes
  const messages = isAdmin ? allMessages : allMessages.filter((m) => !m.isInternal);

  res.json({ ticket, messages });
});

// ── Customer: reply to ticket ────────────────────────────────────────────────
router.post("/support/tickets/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (!isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (ticket.status === "closed") { res.status(400).json({ error: "Ticket is closed" }); return; }

  const { message, isInternal = false } = req.body ?? {};
  if (!message || typeof message !== "string" || message.trim().length < 1) {
    res.status(400).json({ error: "Message is required" }); return;
  }
  // Only admins can post internal notes
  const internalFlag = isAdmin ? Boolean(isInternal) : false;

  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId: id,
    senderId: userId,
    message: message.trim().slice(0, 5000),
    isInternal: internalFlag,
  }).returning();

  // Auto-update status (only for public messages)
  if (!internalFlag) {
    let newStatus: string;
    if (isAdmin) {
      newStatus = "waiting_customer";
    } else {
      newStatus = ticket.status === "waiting_customer" ? "waiting_admin" : ticket.status;
    }
    await db.update(supportTicketsTable)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id));

    // Notify customer when admin replies (non-blocking)
    if (isAdmin) {
      // WhatsApp notification
      void getUserPhone(ticket.userId).then((phone) =>
        sendSupportReplyWhatsApp(phone, ticket.id, ticket.subject)
      );
      // Email notification
      void (async () => {
        const [customer] = await db
          .select({ email: usersTable.email, name: usersTable.name })
          .from(usersTable)
          .where(eq(usersTable.id, ticket.userId))
          .limit(1);
        if (customer?.email) {
          await sendSupportTicketReplyEmail(
            customer.email,
            customer.name ?? "Valued Customer",
            ticket.id,
            ticket.subject,
            message.trim(),
          );
        }
      })();
    }
  } else {
    await db.update(supportTicketsTable)
      .set({ updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id));
  }

  res.status(201).json(msg);
});

// ── Customer: close own ticket ───────────────────────────────────────────────
router.patch("/support/tickets/:id/close", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (!isAdmin && ticket.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (ticket.status === "closed") { res.status(400).json({ error: "Already closed" }); return; }

  const [updated] = await db
    .update(supportTicketsTable)
    .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id))
    .returning();

  res.json(updated);
});

// ── Admin: list all tickets ──────────────────────────────────────────────────
router.get("/admin/support/tickets", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;

  const conditions = [];
  if (status && VALID_STATUSES.includes(status)) conditions.push(eq(supportTicketsTable.status, status));
  if (priority && VALID_PRIORITIES.includes(priority)) conditions.push(eq(supportTicketsTable.priority, priority));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(supportTicketsTable).where(where);

  const tickets = await db
    .select({
      id: supportTicketsTable.id,
      userId: supportTicketsTable.userId,
      orderId: supportTicketsTable.orderId,
      subject: supportTicketsTable.subject,
      category: supportTicketsTable.category,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      closedAt: supportTicketsTable.closedAt,
      createdAt: supportTicketsTable.createdAt,
      updatedAt: supportTicketsTable.updatedAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(supportTicketsTable.updatedAt))
    .limit(limit)
    .offset(offset);

  res.json({ tickets, total: Number(total), page, limit });
});

// ── Admin: update ticket status/priority ────────────────────────────────────
router.patch("/admin/support/tickets/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, priority } = req.body ?? {};
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(String(status))) { res.status(400).json({ error: "Invalid status" }); return; }
    update.status = String(status);
    if (String(status) === "closed") update.closedAt = new Date();
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(String(priority))) { res.status(400).json({ error: "Invalid priority" }); return; }
    update.priority = String(priority);
  }
  const [ticket] = await db.update(supportTicketsTable).set(update).where(eq(supportTicketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json(ticket);
});

export default router;
