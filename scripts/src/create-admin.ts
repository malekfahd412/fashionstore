/**
 * create-admin — First Super Admin bootstrap CLI
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm --filter @workspace/scripts create-admin <email> <password>
 *
 * Rules:
 *   - Refuses to run if an admin already exists (single-run guarantee).
 *   - Never creates a backdoor or public API path.
 *   - Logs nothing sensitive to stdout.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq } from "drizzle-orm";
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg || !passwordArg) {
  console.error("Usage: pnpm create-admin <email> <password>");
  console.error("Example: DATABASE_URL=postgres://... pnpm create-admin admin@example.com SecurePass123!");
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ERROR: Invalid email address.");
  process.exit(1);
}

if (passwordArg.length < 12) {
  console.error("ERROR: Password must be at least 12 characters for an admin account.");
  process.exit(1);
}

const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").notNull().default("customer"),
  active: boolean("active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log("Checking for existing admin accounts...");

  const existing = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));

  if (existing.length > 0) {
    console.error(`ERROR: An admin account already exists (${existing[0].email}).`);
    console.error("The bootstrap command runs ONCE only.");
    console.error("To promote another user, use: UPDATE users SET role = 'admin' WHERE email = '...';");
    await pool.end();
    process.exit(1);
  }

  const userByEmail = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (userByEmail.length > 0) {
    console.error(`ERROR: A user with email ${email} already exists with role '${userByEmail[0].role}'.`);
    console.error("To promote this user, run: UPDATE users SET role = 'admin' WHERE email = '...';");
    await pool.end();
    process.exit(1);
  }

  console.log("Hashing password...");
  const hashed = await bcrypt.hash(passwordArg, 12);

  const [admin] = await db
    .insert(usersTable)
    .values({
      name: "Super Admin",
      email,
      password: hashed,
      role: "admin",
      active: true,
      emailVerified: true,
    })
    .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  console.log("✓ Super admin created successfully.");
  console.log(`  ID:    ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role:  ${admin.role}`);
  console.log("");
  console.log("IMPORTANT: Store these credentials securely. This script cannot be run again.");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
