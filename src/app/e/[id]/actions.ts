"use server";

import { and, count, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, participants, places, votes } from "@/db";
import { getEvent } from "@/lib/events";
import { newId } from "@/lib/ids";
import { PARTICIPANT_COOKIE, getParticipant } from "@/lib/votes";

const MAX_NICKNAME = 20;
const MAX_PARTICIPANTS = 200;

export type JoinResult = { nickname: string; error?: undefined } | { error: string };
export type VoteResult = { ok: true } | { error: "join" | "place" };

/** Joins the event with a nickname, or changes the nickname if this browser already joined. */
export async function joinEvent(eventId: string, rawNickname: string): Promise<JoinResult> {
  const nickname = rawNickname.replace(/\s+/g, " ").trim().slice(0, MAX_NICKNAME);
  if (!nickname) return { error: "이름을 입력해 주세요." };
  if (!(await getEvent(eventId))) return { error: "모임을 찾을 수 없어요." };

  const me = await getParticipant(eventId);
  if (me) {
    await db.update(participants).set({ nickname }).where(eq(participants.id, me.id));
    return { nickname };
  }

  const [{ n }] = await db.select({ n: count() }).from(participants).where(eq(participants.eventId, eventId));
  if (n >= MAX_PARTICIPANTS) return { error: "참여 인원이 너무 많아요." };
  const id = newId();
  await db.insert(participants).values({ id, eventId, nickname });

  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0];
  (await cookies()).set(PARTICIPANT_COOKIE, id, {
    path: `/e/${eventId}`,
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: 60 * 60 * 24 * 180,
  });
  return { nickname };
}

/** Adds or removes this browser's vote for a place. */
export async function setVote(eventId: string, placeId: string, on: boolean): Promise<VoteResult> {
  const me = await getParticipant(eventId);
  if (!me) return { error: "join" };
  const [place] = await db
    .select({ id: places.id })
    .from(places)
    .where(and(eq(places.id, placeId), eq(places.eventId, eventId)))
    .limit(1);
  if (!place) return { error: "place" };
  if (on) await db.insert(votes).values({ placeId, participantId: me.id }).onConflictDoNothing();
  else await db.delete(votes).where(and(eq(votes.placeId, placeId), eq(votes.participantId, me.id)));
  return { ok: true };
}
