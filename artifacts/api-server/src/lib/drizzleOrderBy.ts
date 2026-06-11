import { asc, desc, type SQL, type AnyColumn } from "drizzle-orm";

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
 * - Runtime: throws if validation fails
 */

export type OrderDirection = "asc" | "desc";

/**
 * Safe wrapper for Drizzle orderBy() that enforces strict column + direction signature.
 *
 * @param column - MUST be a Drizzle column reference (e.g., table.column)
 * @param direction - "asc" or "desc"
 * @returns SQL order clause safe for Drizzle queries
 *
 * @throws TypeError if column is not a valid Drizzle column
 * @throws TypeError if direction is not "asc" or "desc"
 *
 * @example
 * // ✅ CORRECT
 * .orderBy(safeOrderBy(loginAttemptsTable.attemptedAt, "desc"))
 *
 * // ❌ WRONG - will throw immediately
 * .orderBy(safeOrderBy(loginAttemptsTable, "desc"))  // table object
 * .orderBy(safeOrderBy("attemptedAt", "desc"))       // string
 * .orderBy(safeOrderBy(undefined, "desc"))           // undefined
 */
export function safeOrderBy(
  column: AnyColumn,
  direction: OrderDirection = "asc",
): SQL<unknown> {
  // ────────────────────────────────────────────────────────────────────────────
  // RUNTIME VALIDATION
  // ────────────────────────────────────────────────────────────────────────────

  // Guard 1: column must be defined
  if (column === undefined || column === null) {
    throw new TypeError(
      "[safeOrderBy] column must be defined. " +
      "Did you pass undefined or null instead of a column reference?",
    );
  }

  // Guard 2: column must be a Drizzle column (has SQL field)
  if (
    typeof column !== "object" ||
    !("__isSelectable" in column) ||
    !column.__isSelectable
  ) {
    throw new TypeError(
      "[safeOrderBy] column must be a valid Drizzle column reference. " +
      `Received: ${typeof column} ${
        typeof column === "string" ? `("${column}")` : ""
      }. ` +
      "Did you pass a table object or string instead of table.column?",
    );
  }

  // Guard 3: direction must be valid
  if (direction !== "asc" && direction !== "desc") {
    throw new TypeError(
      `[safeOrderBy] direction must be "asc" or "desc". Received: "${direction}"`,
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CONSTRUCT & RETURN
  // ────────────────────────────────────────────────────────────────────────────

  return direction === "asc" ? asc(column) : desc(column);
}

/**
 * Type guard to validate column at compile time.
 *
 * Use this to prevent invalid column types:
 *
 * @example
 * function myQuery<T extends AnyColumn>(col: T): ... {
 *   // compile error if col is not a valid column
 *   const order = safeOrderBy(col, "desc");
 *   ...
 * }
 */
export type SafeOrderByColumn = AnyColumn;
