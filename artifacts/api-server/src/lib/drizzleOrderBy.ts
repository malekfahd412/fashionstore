import { asc, desc, type SQL } from "drizzle-orm";

export type OrderDirection = "asc" | "desc";

export function safeOrderBy(
  column: unknown,
  direction: OrderDirection = "asc",
) {
  if (column == null) {
    throw new TypeError(
      "[safeOrderBy] column cannot be null or undefined",
    );
  }

  if (typeof column === "string") {
    throw new TypeError(
      `[safeOrderBy] strings are not allowed: "${column}". Use table.column instead.`,
    );
  }

  if (direction !== "asc" && direction !== "desc") {
    throw new TypeError(
      `[safeOrderBy] invalid direction "${direction}"`,
    );
  }

  return direction === "asc"
    ? asc(column as any)
    : desc(column as any);
}

export type SafeOrderByColumn = unknown;