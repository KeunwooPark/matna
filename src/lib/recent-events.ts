// Browser-only: used from client components.
import { useSyncExternalStore } from "react";

/** An event this browser has opened, kept so the home page can list it. */
export type RecentEvent = {
  id: string;
  title: string;
  /** Set once this browser has opened the host page, so the list can link back to it. */
  hostToken?: string;
  seenAt: number;
};

const KEY = "matna:recent-events";
const MAX = 10;
const CHANGE = "matna:recent-events-change";
const empty: RecentEvent[] = [];

// localStorage can be missing or throw (private mode, blocked storage), so every access is guarded.
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// useSyncExternalStore needs the same array back while the stored string hasn't changed.
let cache: { raw: string | null; list: RecentEvent[] } = { raw: null, list: empty };

function snapshot(): RecentEvent[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.list;
  let list = empty;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter((e): e is RecentEvent => typeof e?.id === "string" && typeof e?.title === "string");
  } catch {
    // Corrupt entry: treat as empty; the next visit overwrites it.
  }
  cache = { raw, list };
  return list;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/** Moves the event to the top of the list, updating its title and keeping a host token already saved. */
export function rememberEvent(event: { id: string; title: string; hostToken?: string }) {
  const list = snapshot();
  const prev = list.find((e) => e.id === event.id);
  const entry: RecentEvent = { id: event.id, title: event.title, hostToken: event.hostToken ?? prev?.hostToken, seenAt: Date.now() };
  const next = [entry, ...list.filter((e) => e.id !== event.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE));
  } catch {
    // Storage unavailable: the list just won't remember this event.
  }
}

/** Events this browser has opened, most recent first. Empty on the server and until hydrated. */
export function useRecentEvents(): RecentEvent[] {
  return useSyncExternalStore(subscribe, snapshot, () => empty);
}
