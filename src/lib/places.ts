import "server-only";
import { and, count, desc, eq, isNotNull, isNull, max } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, places } from "@/db";
import { participants } from "@/db/schema";
import { ResolveError, resolvePlace } from "./resolve";

export const MAX_PLACES = 30;
/** How many live places one participant may have added. The host has no cap of its own. */
export const MAX_PLACES_PER_GUEST = 10;

export type InsertResult = { id: string; error?: undefined } | { error: string };

/** Live places of an event. */
export const live = (eventId: string) => and(eq(places.eventId, eventId), isNull(places.deletedAt));

async function countLive(eventId: string, addedBy?: string) {
  const where = addedBy ? and(live(eventId), eq(places.addedBy, addedBy)) : live(eventId);
  const [{ n }] = await db.select({ n: count() }).from(places).where(where);
  return n;
}

async function isDuplicate(eventId: string, embedUrl: string, exceptId?: string) {
  const rows = await db
    .select({ id: places.id })
    .from(places)
    .where(and(live(eventId), eq(places.embedUrl, embedUrl)));
  return rows.some((r) => r.id !== exceptId);
}

/**
 * Resolves a pasted link and appends it to the event's places.
 * `addedBy` is the participant adding it, or null for the host.
 */
export async function insertPlace(eventId: string, input: string, addedBy: string | null): Promise<InsertResult> {
  if (!input.trim()) return { error: "링크를 붙여 넣어 주세요." };
  if ((await countLive(eventId)) >= MAX_PLACES) return { error: `장소는 최대 ${MAX_PLACES}개까지 추가할 수 있어요.` };
  if (addedBy && (await countLive(eventId, addedBy)) >= MAX_PLACES_PER_GUEST) {
    return { error: `한 사람이 추가할 수 있는 장소는 ${MAX_PLACES_PER_GUEST}개까지예요.` };
  }

  let resolved;
  try {
    resolved = await resolvePlace(input);
  } catch (e) {
    if (e instanceof ResolveError) return { error: e.message };
    throw e;
  }
  if (await isDuplicate(eventId, resolved.embedUrl)) return { error: "이미 후보에 있는 장소예요." };

  // Positions count deleted places too, so a restored place can keep its old one.
  const [{ last }] = await db.select({ last: max(places.position) }).from(places).where(eq(places.eventId, eventId));
  const [row] = await db
    .insert(places)
    .values({ ...resolved, eventId, addedBy, position: (last ?? -1) + 1 })
    .returning({ id: places.id });
  return { id: row.id };
}

/** Soft-deletes a place. `deletedBy` is the participant, or null for the host. Returns false if it wasn't live. */
export async function softDeletePlace(eventId: string, placeId: string, deletedBy: string | null) {
  const rows = await db
    .update(places)
    .set({ deletedAt: new Date(), deletedBy })
    .where(and(live(eventId), eq(places.id, placeId)))
    .returning({ id: places.id });
  return rows.length > 0;
}

/**
 * Brings a deleted place back, with its votes. When `deletedBy` is given (a participant undoing),
 * only a place that participant deleted can be restored. Returns an error message on failure.
 */
export async function restoreDeletedPlace(eventId: string, placeId: string, deletedBy?: string): Promise<string | null> {
  const [place] = await db
    .select({ embedUrl: places.embedUrl, deletedBy: places.deletedBy })
    .from(places)
    .where(and(eq(places.eventId, eventId), eq(places.id, placeId), isNotNull(places.deletedAt)))
    .limit(1);
  if (!place || (deletedBy !== undefined && place.deletedBy !== deletedBy)) return "되돌릴 수 없는 장소예요.";
  if ((await countLive(eventId)) >= MAX_PLACES) return `장소는 최대 ${MAX_PLACES}개까지 둘 수 있어요.`;
  if (await isDuplicate(eventId, place.embedUrl, placeId)) return "같은 장소가 이미 후보에 있어요.";
  await db.update(places).set({ deletedAt: null, deletedBy: null }).where(eq(places.id, placeId));
  return null;
}

const deleter = alias(participants, "deleter");

/** Recently deleted places, newest first, with the deleter's nickname (null = the host). */
export function getDeletedPlaces(eventId: string, limit = 20) {
  return db
    .select({ id: places.id, title: places.title, deletedAt: places.deletedAt, deletedByName: deleter.nickname })
    .from(places)
    .leftJoin(deleter, eq(places.deletedBy, deleter.id))
    .where(and(eq(places.eventId, eventId), isNotNull(places.deletedAt)))
    .orderBy(desc(places.deletedAt))
    .limit(limit);
}
