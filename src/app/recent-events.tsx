"use client";

import { useRecentEvents } from "@/lib/recent-events";

const SHOWN = 5;

/** Events this browser has opened, so someone coming back can find them (and recognize the app). */
export function RecentEvents() {
  const list = useRecentEvents();
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="recent-events-title" className="flex flex-col gap-2">
      <h2 id="recent-events-title" className="text-sm font-medium text-muted">
        내가 참여한 모임
      </h2>
      <ul className="flex flex-col gap-2">
        {list.slice(0, SHOWN).map((e) => (
          <li key={e.id} className="flex items-center gap-2 rounded-xl border border-line">
            <a href={`/e/${e.id}`} className="min-w-0 flex-1 truncate px-4 py-3 font-medium">
              {e.title}
            </a>
            {e.hostToken && (
              <a
                href={`/e/${e.id}/host?t=${encodeURIComponent(e.hostToken)}`}
                className="mr-2 shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-accent"
              >
                관리
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
