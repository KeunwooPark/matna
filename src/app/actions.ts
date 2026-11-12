"use server";

import { and, count, eq, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db, events, places } from "@/db";
import { getEventAsHost, getPlaces } from "@/lib/events";
import { newId } from "@/lib/ids";
import { ResolveError, resolvePlace } from "@/lib/resolve";

const MAX_PLACES = 30;

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
  if (!input.trim()) return { error: "링크를 붙여 넣어 주세요.", input };

  const [{ n }] = await db.select({ n: count() }).from(places).where(eq(places.eventId, eventId));
  if (n >= MAX_PLACES) return { error: `장소는 최대 ${MAX_PLACES}개까지 추가할 수 있어요.`, input };

  let resolved;
  try {
    resolved = await resolvePlace(input);
  } catch (e) {
    if (e instanceof ResolveError) return { error: e.message, input };
    throw e;
  }
  const [{ last }] = await db.select({ last: max(places.position) }).from(places).where(eq(places.eventId, eventId));
  await db.insert(places).values({ ...resolved, eventId, position: (last ?? -1) + 1 });
  refresh();
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function removePlace(eventId: string, token: string, placeId: string) {
  await requireHost(eventId, token);
  await db.delete(places).where(and(eq(places.id, placeId), eq(places.eventId, eventId)));
  refresh();
}

export async function renamePlace(eventId: string, token: string, placeId: string, form: FormData) {
  await requireHost(eventId, token);
  const title = String(form.get("title") ?? "").trim().slice(0, 100);
  if (!title) return;
  await db.update(places).set({ title }).where(and(eq(places.id, placeId), eq(places.eventId, eventId)));
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
