import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, events, places, type Event } from "@/db";
import { tokensMatch } from "./ids";

export async function getEvent(id: string): Promise<Event | null> {
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return event ?? null;
}

/** The event, if `token` is its host token. */
export async function getEventAsHost(id: string, token: string | undefined): Promise<Event | null> {
  const event = await getEvent(id);
  return event && token && tokensMatch(event.hostToken, token) ? event : null;
}

export function getPlaces(eventId: string) {
  return db.select().from(places).where(eq(places.eventId, eventId)).orderBy(asc(places.position), asc(places.createdAt));
}
