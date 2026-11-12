import "server-only";
import { asc, eq, getTableColumns } from "drizzle-orm";
import { db, events, participants, places, type Event } from "@/db";
import { tokensMatch } from "./ids";
import { live } from "./places";

export async function getEvent(id: string): Promise<Event | null> {
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return event ?? null;
}

/** The event, if `token` is its host token. */
export async function getEventAsHost(id: string, token: string | undefined): Promise<Event | null> {
  const event = await getEvent(id);
  return event && token && tokensMatch(event.hostToken, token) ? event : null;
}

/** Live (not deleted) places in display order, with the nickname of the participant who added each (null = the host). */
export function getPlaces(eventId: string) {
  return db
    .select({ ...getTableColumns(places), addedByName: participants.nickname })
    .from(places)
    .leftJoin(participants, eq(places.addedBy, participants.id))
    .where(live(eventId))
    .orderBy(asc(places.position), asc(places.createdAt));
}

export type ListedPlace = Awaited<ReturnType<typeof getPlaces>>[number];
