"use client";

import { useEffect } from "react";
import { rememberEvent } from "@/lib/recent-events";

/** Records the event in this browser's recent list, shown on the home page. Renders nothing. */
export function RememberEvent({ id, title, hostToken }: { id: string; title: string; hostToken?: string }) {
  useEffect(() => {
    rememberEvent({ id, title, hostToken });
  }, [id, title, hostToken]);
  return null;
}
