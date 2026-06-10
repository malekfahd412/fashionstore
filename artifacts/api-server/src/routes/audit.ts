import { Router, type IRouter } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, desc, and, ilike, gte, lte, SQL } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/audit-logs", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { userId, resource, action, search, from, to, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10) || 50);

  const conditions: SQL[] = [];
  if (userId) conditions.push(eq(auditLogsTable.userId, parseInt(userId, 10)));
  if (resource) conditions.push(eq(auditLogsTable.resource, resource));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (search) conditions.push(ilike(auditLogsTable.userEmail, `%${search}%`));
  if (from) conditions.push(gte(auditLogsTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(auditLogsTable.createdAt, new Date(to)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, total] = await Promise.all([
    db.select().from(auditLogsTable)
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum),
    db.$count(auditLogsTable, where),
  ]);

  res.json({ logs, total, page: pageNum, limit: limitNum });
});

export default router;
