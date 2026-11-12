import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, participants, places, votes } from "@/db";

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
  const [placeRows, voteRows] = await Promise.all([
    db.select({ id: places.id }).from(places).where(eq(places.eventId, eventId)).orderBy(asc(places.position), asc(places.createdAt)),
    db
      .select({ placeId: votes.placeId, participantId: votes.participantId, nickname: participants.nickname })
      .from(votes)
      .innerJoin(participants, eq(votes.participantId, participants.id))
      .where(eq(participants.eventId, eventId))
      .orderBy(asc(votes.createdAt)),
  ]);
  const others: Record<string, string[]> = {};
  const mine: string[] = [];
  for (const v of voteRows) {
    if (v.participantId === me?.id) mine.push(v.placeId);
    else (others[v.placeId] ??= []).push(v.nickname);
  }
  return { placeIds: placeRows.map((p) => p.id), others, mine, me: me && { nickname: me.nickname } };
}

export async function countParticipants(eventId: string): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(participants).where(eq(participants.eventId, eventId));
  return n;
}
