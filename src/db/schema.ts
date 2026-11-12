import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  // Random 22-character ID. Knowing it is what lets someone view and vote.
  id: text("id").primaryKey(),
  // Second secret, only in the host's link. Required for every edit.
  hostToken: text("host_token").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providers = ["naver", "kakao", "google"] as const;
export type Provider = (typeof providers)[number];

export const places = pgTable("places", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: providers }).notNull(),
  // The link exactly as the host pasted it.
  originalUrl: text("original_url").notNull(),
  // Loaded in the in-app viewer. Must be a URL the provider allows in an iframe.
  embedUrl: text("embed_url").notNull(),
  // Opened in a new tab or the provider's app ("Open in app" fallback).
  openUrl: text("open_url").notNull(),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participants = pgTable("participants", {
  // Random ID, kept in the participant's localStorage.
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.placeId, t.participantId] })],
);

export type Event = typeof events.$inferSelect;
export type Place = typeof places.$inferSelect;
