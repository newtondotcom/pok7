import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const client = postgres(process.env.LOCAL_DATABASE_URL as string, {
  prepare: false,
});
export const db = drizzle(client);
