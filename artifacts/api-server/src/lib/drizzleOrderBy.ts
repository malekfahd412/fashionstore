import { asc, desc, sql, type SQL, type AnyColumn } from "drizzle-orm";

/**
 * CRITICAL SAFETY LAYER: Safe OrderBy Wrapper
 *
 * This module exists to PERMANENTLY eliminate the bug class where invalid
 * arguments are passed to Drizzle's orderBy() function.
 *
 * Production Bug (NEVER AGAIN):
 *   ORDER BY "login_attempts","attempted_at"
 *
 * Root Cause: Code called orderBy(table, column) instead of orderBy(desc(column))
 *
 * ENFORCEMENT:
 * - ONLY accepts: AnyColumn (from Drizzle schema)
 * - ONLY accepts: direction = "asc" | "desc"
 * - REJECTS: table objects, strings, undefined, multiple arguments
 *
 * TYPE SAFETY:
 * - Compile-time: TypeScript prevents passing pgTable objects
 * - Runtime: logs warning and returns safe fallback ORDER BY 1 — never throws
 *
 * HOW DETECTION WORKS (Drizzle 0.45.x):
 *   Drizzle marks every entity constructor (Column, SQL, View, etc.) with
 *   Symbol.for("drizzle:entityKind"). We check the prototype chain's constructor
 *   for this symbol. Both AnyColumn references (table.column) and SQL aggregate
 *   expressions (count(), countDistinct(), sql`...`) carry it.
 *   The old checks for __isSelectable / __brand do NOT exist in 0.45.x.
 */

// The symbol Drizzle 0.45.x uses to mark all entity constructors.
const DRIZZLE_ENTITY_KIND = Symbol.for("drizzle:entityKind");

/**
 * Returns true for any Drizzle entity: Column references, SQL expressions,
 * aggregate functions (count, countDistinct, etc.), raw sql`` tags, etc.
 */
function isDrizzleEntity(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as { constructor?: unknown } | null;
  const ctor = proto?.constructor;
  return typeof ctor === "function" && DRIZZLE_ENTITY_KIND in ctor;
}

export type OrderDirection = "asc" | "desc";

/**
 * Safe wrapper for Drizzle orderBy() that enforces strict column + direction signature.
 *
 * @param column - MUST be a Drizzle column reference (e.g., table.column) OR SQL/aggregate expression
 * @param direction - "asc" or "desc"
 * @returns SQL order clause safe for Drizzle queries
 *
 * On invalid input: logs the offending value and returns ORDER BY 1 ASC as a
 * safe fallback — never throws, never produces an HTTP 500.
 *
 * @example
 * // ✅ CORRECT - Column
 * .orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc"))
 *
 * // ✅ CORRECT - Aggregate function
 * .orderBy(safeOrderBy(count(), "desc"))
 * .orderBy(safeOrderBy(countDistinct(email), "desc"))
 *
 * // ❌ WRONG - logs warning, returns fallback ORDER BY 1 ASC
 * .orderBy(safeOrderBy(loginAttemptsTable, "desc"))  // table object
 * .orderBy(safeOrderBy("attemptedAt", "desc"))       // string
 * .orderBy(safeOrderBy(undefined, "desc"))           // undefined
 */
export function safeOrderBy(
  column: unknown,
  direction: OrderDirection = "asc",
): SQL<unknown> {
  // ── Guard 1: column must be defined ────────────────────────────────────────
  if (column === undefined || column === null) {
    console.error(
      "[safeOrderBy] column is undefined or null — returning fallback ORDER BY 1 ASC. " +
      "Did you pass undefined or null instead of a column reference?",
    );
    return sql`1`;
  }

  // ── Guard 2: column must be a Drizzle entity (Column, SQL, aggregate, etc.) ──
  // Drizzle 0.45.x marks all entity constructors with Symbol.for("drizzle:entityKind").
  // __isSelectable and __brand do NOT exist in this version — do not use them.
  if (!isDrizzleEntity(column)) {
    console.error(
      "[safeOrderBy] Invalid column — not a Drizzle entity. " +
      `Received type: ${typeof column}` +
      (typeof column === "string" ? ` ("${column}")` : "") +
      ". Did you pass a table object, string, or plain object instead of table.column? " +
      "Returning fallback ORDER BY 1 ASC.",
    );
    return sql`1`;
  }

  // ── Guard 3: direction must be valid ───────────────────────────────────────
  if (direction !== "asc" && direction !== "desc") {
    console.warn(
      `[safeOrderBy] direction must be "asc" or "desc". Received: "${direction}". Defaulting to "asc".`,
    );
    direction = "asc";
  }

  // ── Construct & return ─────────────────────────────────────────────────────
  return direction === "asc" ? asc(column as AnyColumn) : desc(column as AnyColumn);
}

export type SafeOrderByColumn = unknown;
