import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Devices table
export const devices = pgTable("devices", {
  id: text("id").primaryKey(), // deviceId from frontend
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  name: text("name"), // "Chrome on Windows"
  userAgent: text("user_agent"),
  lastSeen: timestamp("last_seen", { withTimezone: false, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: false, mode: "date" })
    .defaultNow()
    .notNull(),
});

// Push subscriptions table with device relationship
export const webpush = pgTable("webpush", {
  id: text("id").primaryKey(), // endpoint
  deviceId: text("device_id")
    .notNull()
    .references(() => devices.id)
    .unique(), // Ensure one subscription per device
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  endpoint: text("endpoint").notNull().unique(),
  expirationTime: timestamp("expiration_time", {
    withTimezone: false,
    mode: "date",
  }),
  options: text("options").notNull(), // JSON with keys
  createdAt: timestamp("created_at", { withTimezone: false, mode: "date" })
    .defaultNow()
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Relations for better querying
export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(user, {
    fields: [devices.userId],
    references: [user.id],
  }),
  webPushSubscriptions: many(webpush),
}));

export const webpushRelations = relations(webpush, ({ one }) => ({
  device: one(devices, {
    fields: [webpush.deviceId],
    references: [devices.id],
  }),
  user: one(user, {
    fields: [webpush.userId],
    references: [user.id],
  }),
}));

// Pokes table : userA, userB, last_poke_by, count, date_last_poke, visible_leaderboard
export const pokes = pgTable("pokes", {
  id: text("id").primaryKey(),
  userAId: text("user_a_id")
    .notNull()
    .references(() => user.id),
  userBId: text("user_b_id")
    .notNull()
    .references(() => user.id),
  count: integer("count").notNull(),
  lastPokeDate: timestamp("last_poke_date", {
    withTimezone: false,
    mode: "date",
  }).notNull(),
  lastPokeBy: text("last_poke_by")
    .notNull()
    .references(() => user.id),
  visibleLeaderboard: boolean("visible_leaderboard").notNull(),
});
