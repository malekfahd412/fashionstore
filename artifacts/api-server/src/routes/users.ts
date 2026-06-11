import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { UpdateUserBody, GetUserParams, DeleteUserParams, UpdateUserParams, ListUsersQueryParams } from "@workspace/api-zod";
import { auditLog } from "../lib/audit";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  const { role, search, page = 1, limit = 20 } = query.success ? query.data : {};
  const conditions: SQL[] = [];
  if (role) conditions.push(eq(usersTable.role, role));
  if (search) conditions.push(ilike(usersTable.name, `%${search}%`));
  const users = await db.select().from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(Number(limit))
    .offset((Number(page) - 1) * Number(limit));
  const total = await db.$count(usersTable, conditions.length > 0 ? and(...conditions) : undefined);
  res.json({
    users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, createdAt: u.createdAt })),
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  if (req.user!.role !== "admin" && req.user!.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, emailPreferences: user.emailPreferences, createdAt: user.createdAt });
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  if (req.user!.role !== "admin" && req.user!.id !== params.data.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates: Partial<typeof parsed.data> & { role?: string } = { ...parsed.data };
  if (req.user!.role !== "admin") delete updates.role;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, emailPreferences: user.emailPreferences, createdAt: user.createdAt });
});

const EmailPreferencesBody = z.object({
  orderUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
});

router.patch("/users/:id/email-preferences", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  if (req.user!.id !== params.data.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = EmailPreferencesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [current] = await db.select({ emailPreferences: usersTable.emailPreferences }).from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!current) { res.status(404).json({ error: "User not found" }); return; }
  const merged = { ...(current.emailPreferences ?? { orderUpdates: true, promotions: true, securityAlerts: true }), ...parsed.data };
  const [user] = await db.update(usersTable).set({ emailPreferences: merged }).where(eq(usersTable.id, params.data.id)).returning();
  res.json({ emailPreferences: user.emailPreferences });
});

router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [before] = await db.select({ email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, params.data.id));
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  await auditLog(req, "DELETE", "user", params.data.id, before, null);
  res.json({ message: "User deleted" });
});

export default router;
