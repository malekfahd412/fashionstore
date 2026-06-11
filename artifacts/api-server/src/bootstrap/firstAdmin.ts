/**
 * First-admin bootstrap via environment variables.
 *
 * If ADMIN_EMAIL and ADMIN_PASSWORD are set at server startup AND no admin
 * user exists yet, one is created automatically.  This is a one-time operation:
 * on subsequent restarts the check short-circuits immediately.
 *
 * Environment variables:
 *   ADMIN_EMAIL     — email address for the first admin account
 *   ADMIN_PASSWORD  — plaintext password (min 12 chars); cleared from memory after use
 *
 * Both vars must be present together, or neither is used.
 */

import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function bootstrapFirstAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) return;

  if (adminPassword.length < 12) {
    logger.warn("ADMIN_PASSWORD must be at least 12 characters — skipping first-admin bootstrap");
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));

  if (existing.length > 0) {
    logger.info("First-admin bootstrap skipped — admin account already exists");
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 12);

  const [admin] = await db
    .insert(usersTable)
    .values({
      name: "Super Admin",
      email: adminEmail,
      password: hashed,
      role: "admin",
      active: true,
      emailVerified: true,
    })
    .returning({ id: usersTable.id, email: usersTable.email });

  logger.info({ adminId: admin.id, email: admin.email }, "First admin account created via env-var bootstrap");

  // Unset sensitive vars from the process environment after use
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD;
}
