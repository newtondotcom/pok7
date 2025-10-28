import { drizzle } from "drizzle-orm/node-postgres";
import { eq, or, inArray, and, not, like, desc, asc, count, sql } from "drizzle-orm";

export const db = drizzle(process.env.DATABASE_URL || "");

// Re-export common drizzle-orm operators
export { eq, or, inArray, and, not, like, desc, asc, count, sql };