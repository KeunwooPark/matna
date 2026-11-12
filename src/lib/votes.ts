import "server-only";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, events, participants, places, votes } from "@/db";
import { getDeletedPlaces, live } from "./places";

/** Deletions this recent are reported to clients, so they can say who removed the place they had open. */
const REMOVED_WINDOW_MS = 10 * 60 * 1000;

/** httpOnly cookie holding the participant ID, scoped to the event's path (`/e/{id}`). */
export const PARTICIPANT_COOKIE = "matna_p";

export type Participant = { id: string; nickname: string };

/** What a participant's page needs to show votes. Other people's participant IDs are never sent. */
export type Tally = {
  /** Current place order, so clients notice when the host adds, removes or reorders places. */
  placeIds: string[];
  /** Nicknames of other participants who picked each place, oldest vote first. */
  others: Record<string, string[]>;
  /** Places the requesting participant picked. */
  mine: string[];
  me: { nickname: string } | null;
  /** Whether participants may add and delete places right now. */
  guestsCanEdit: boolean;
  /** Places deleted in the last few minutes: title and who deleted it (null = the host). */
  removed: Record<string, { title: string; by: string | null }>;
};

/** The participant for this browser, if its cookie belongs to `eventId`. */
export async function getParticipant(eventId: string): Promise<Participant | null> {
  const id = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  if (!id) return null;
  const [p] = await db
    .select({ id: participants.id, nickname: participants.nickname })
    .from(participants)
    .where(and(eq(participants.id, id), eq(participants.eventId, eventId)))
    .limit(1);
  return p ?? null;
}

export async function getTally(eventId: string, me: Participant | null): Promise<Tally> {
  const [placeRows, voteRows, eventRows, deleted] = await Promise.all([
    db.select({ id: places.id }).from(places).where(live(eventId)).orderBy(asc(places.position), asc(places.createdAt)),
    db
      .select({ placeId: votes.placeId, participantId: votes.participantId, nickname: participants.nickname })
      .from(votes)
      .innerJoin(participants, eq(votes.participantId, participants.id))
      // Votes on deleted places are kept (for undo) but not counted.
      .innerJoin(places, and(eq(votes.placeId, places.id), isNull(places.deletedAt)))
      .where(eq(participants.eventId, eventId))
      .orderBy(asc(votes.createdAt)),
    db.select({ guestsCanEdit: events.guestsCanEdit }).from(events).where(eq(events.id, eventId)).limit(1),
    getDeletedPlaces(eventId, 10),
  ]);
  const removed: Tally["removed"] = {};
  for (const d of deleted) {
    if (d.deletedAt && Date.now() - d.deletedAt.getTime() < REMOVED_WINDOW_MS) removed[d.id] = { title: d.title, by: d.deletedByName };
  }
  const others: Record<string, string[]> = {};
  const mine: string[] = [];
  for (const v of voteRows) {
    if (v.participantId === me?.id) mine.push(v.placeId);
    else (others[v.placeId] ??= []).push(v.nickname);
  }
  return {
    placeIds: placeRows.map((p) => p.id),
    others,
    mine,
    me: me && { nickname: me.nickname },
    guestsCanEdit: eventRows[0]?.guestsCanEdit ?? false,
    removed,
  };
}

export async function countParticipants(eventId: string): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(participants).where(eq(participants.eventId, eventId));
  return n;
}
