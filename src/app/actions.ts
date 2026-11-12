"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db, events, places } from "@/db";
import { getEventAsHost, getPlaces } from "@/lib/events";
import { newId } from "@/lib/ids";
import { insertPlace, live, restoreDeletedPlace, softDeletePlace } from "@/lib/places";

export type FormState = { error?: string; input?: string; ok?: number };

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const title = String(form.get("title") ?? "").trim().slice(0, 60);
  if (!title) return { error: "모임 이름을 입력해 주세요." };
  const id = newId();
  const hostToken = newId();
  await db.insert(events).values({ id, hostToken, title });
  redirect(`/e/${id}/host?t=${hostToken}`);
}

async function requireHost(eventId: string, token: string) {
  const event = await getEventAsHost(eventId, token);
  if (!event) throw new Error("Not the host of this event");
  return event;
}

export async function addPlace(eventId: string, token: string, prev: FormState, form: FormData): Promise<FormState> {
  await requireHost(eventId, token);
  const input = String(form.get("link") ?? "").slice(0, 2000);
  const result = await insertPlace(eventId, input, null);
  if (result.error !== undefined) return { error: result.error, input };
  refresh();
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function removePlace(eventId: string, token: string, placeId: string) {
  await requireHost(eventId, token);
  await softDeletePlace(eventId, placeId, null);
  refresh();
}

/** Brings back a place anyone deleted. */
export async function restorePlace(eventId: string, token: string, placeId: string): Promise<{ error?: string }> {
  await requireHost(eventId, token);
  const error = await restoreDeletedPlace(eventId, placeId);
  if (error) return { error };
  refresh();
  return {};
}

/** Turns participants' ability to add and delete places on or off. */
export async function setGuestsCanEdit(eventId: string, token: string, on: boolean) {
  await requireHost(eventId, token);
  await db.update(events).set({ guestsCanEdit: on }).where(eq(events.id, eventId));
  refresh();
}

export async function renamePlace(eventId: string, token: string, placeId: string, form: FormData) {
  await requireHost(eventId, token);
  const title = String(form.get("title") ?? "").trim().slice(0, 100);
  if (!title) return;
  await db.update(places).set({ title }).where(and(eq(places.id, placeId), live(eventId)));
  refresh();
}

/** Moves a place one step earlier (-1) or later (+1) and renumbers the list. */
export async function movePlace(eventId: string, token: string, placeId: string, dir: -1 | 1) {
  await requireHost(eventId, token);
  await db.transaction(async (tx) => {
    const list = await getPlaces(eventId);
    const i = list.findIndex((p) => p.id === placeId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (const [pos, p] of list.entries()) {
      if (p.position !== pos) await tx.update(places).set({ position: pos }).where(eq(places.id, p.id));
    }
  });
  refresh();
}
