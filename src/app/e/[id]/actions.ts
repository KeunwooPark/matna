"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { db, participants, places, votes } from "@/db";
import { getEvent } from "@/lib/events";
import { newId } from "@/lib/ids";
import { insertPlace, live, restoreDeletedPlace, softDeletePlace } from "@/lib/places";
import { PARTICIPANT_COOKIE, countParticipants, getParticipant, type Participant } from "@/lib/votes";

const MAX_NICKNAME = 20;
const MAX_PARTICIPANTS = 200;

export type JoinResult = { nickname: string; error?: undefined } | { error: string };
export type VoteResult = { ok: true } | { error: "join" | "place" };
/** "join": this browser has no nickname yet. "locked": the host turned participant editing off. */
export type EditError = { error: "join" } | { error: "locked" } | { error: "message"; message: string };
export type SuggestResult = { id: string } | EditError;

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

  if ((await countParticipants(eventId)) >= MAX_PARTICIPANTS) return { error: "참여 인원이 너무 많아요." };
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
    .where(and(eq(places.id, placeId), live(eventId)))
    .limit(1);
  if (!place) return { error: "place" };
  if (on) await db.insert(votes).values({ placeId, participantId: me.id }).onConflictDoNothing();
  else await db.delete(votes).where(and(eq(votes.placeId, placeId), eq(votes.participantId, me.id)));
  return { ok: true };
}

/** The participant, if this browser joined and participants may edit this event's places. */
async function requireEditor(eventId: string): Promise<{ me: Participant } | { error: "join" | "locked" }> {
  const me = await getParticipant(eventId);
  if (!me) return { error: "join" };
  const event = await getEvent(eventId);
  if (!event?.guestsCanEdit) return { error: "locked" };
  return { me };
}

/** Adds a place from a pasted map link, credited to this participant. */
export async function suggestPlace(eventId: string, rawInput: string): Promise<SuggestResult> {
  const editor = await requireEditor(eventId);
  if ("error" in editor) return { error: editor.error };
  const result = await insertPlace(eventId, rawInput.slice(0, 2000), editor.me.id);
  if (result.error !== undefined) return { error: "message", message: result.error };
  refresh();
  return { id: result.id };
}

/** Deletes a place (softly, so it can be undone). Anyone who joined may delete any place. */
export async function deletePlace(eventId: string, placeId: string): Promise<{ ok: true } | EditError> {
  const editor = await requireEditor(eventId);
  if ("error" in editor) return { error: editor.error };
  if (!(await softDeletePlace(eventId, placeId, editor.me.id))) return { error: "message", message: "이미 삭제된 장소예요." };
  refresh();
  return { ok: true };
}

/** Undoes this participant's own delete. */
export async function undoDeletePlace(eventId: string, placeId: string): Promise<{ ok: true } | EditError> {
  const editor = await requireEditor(eventId);
  if ("error" in editor) return { error: editor.error };
  const message = await restoreDeletedPlace(eventId, placeId, editor.me.id);
  if (message) return { error: "message", message };
  refresh();
  return { ok: true };
}
