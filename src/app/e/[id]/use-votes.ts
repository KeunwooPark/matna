"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tally } from "@/lib/votes";
import { setVote, type VoteResult } from "./actions";

const POLL_MS = 4000;

/**
 * Keeps the vote tally fresh by polling, and applies this participant's toggles optimistically.
 * A toggle shows at once; the override is dropped only after a tally fetched after the save arrives.
 */
export function useVotes(eventId: string, initial: Tally, placeIds: string[]) {
  const router = useRouter();
  const [tally, setTally] = useState(initial);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const fetchSeq = useRef(0);
  const acceptFrom = useRef(0); // responses to fetches started before the last save are stale
  const voteSeq = useRef<Record<string, number>>({});
  const placeKey = placeIds.join();
  const placeKeyRef = useRef(placeKey);
  useEffect(() => {
    placeKeyRef.current = placeKey;
  }, [placeKey]);

  const refetch = useCallback(async () => {
    const seq = ++fetchSeq.current;
    try {
      const res = await fetch(`/e/${eventId}/tally`, { cache: "no-store" });
      if (!res.ok) return;
      const next: Tally = await res.json();
      if (seq < acceptFrom.current) return;
      setTally(next);
      // The host added, removed or reordered places: reload the server-rendered list.
      if (next.placeIds.join() !== placeKeyRef.current) router.refresh();
    } catch {
      // Offline or server hiccup: keep the last tally and try again on the next poll.
    }
  }, [eventId, router]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refetch]);

  const isSelected = (placeId: string) => pending[placeId] ?? tally.mine.includes(placeId);

  async function vote(placeId: string, on: boolean): Promise<VoteResult | { error: "network" }> {
    const seq = (voteSeq.current[placeId] = (voteSeq.current[placeId] ?? 0) + 1);
    setPending((p) => ({ ...p, [placeId]: on }));
    let result: VoteResult | { error: "network" };
    try {
      result = await setVote(eventId, placeId, on);
    } catch {
      result = { error: "network" };
    }
    acceptFrom.current = fetchSeq.current + 1;
    await refetch();
    if (voteSeq.current[placeId] === seq) {
      setPending((p) => {
        const rest = { ...p };
        delete rest[placeId];
        return rest;
      });
    }
    return result;
  }

  const setMe = (nickname: string | null) => setTally((t) => ({ ...t, me: nickname === null ? null : { nickname } }));

  return { tally, isSelected, vote, setMe, refetch };
}
