import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";

export async function auditLog(
  req: Request,
  action: string,
  resource: string,
  resourceId?: string | number | null,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  if (!req.user) return;
  try {
    await db.insert(auditLogsTable).values({
      userId: req.user.id,
      userEmail: req.user.email,
      action,
      resource,
      resourceId: resourceId != null ? String(resourceId) : null,
      before: before !== undefined ? JSON.stringify(before) : null,
      after: after !== undefined ? JSON.stringify(after) : null,
      ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null,
    });
  } catch {
    // Non-fatal — never block the main request for audit failure
  }
}
