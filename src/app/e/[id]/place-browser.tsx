"use client";

import { useState } from "react";
import type { Provider } from "@/db/schema";
import { PlaceThumb, ProviderBadge } from "@/components/provider-badge";

export type BrowserPlace = {
  id: string;
  provider: Provider;
  title: string;
  thumbnailUrl: string | null;
  embedUrl: string;
  openUrl: string;
};

// Recently opened places keep their iframe (hidden) so going back to one doesn't reload it.
const KEEP_FRAMES = 4;

/** Participant view: a horizontal strip of cards on top, the open place's page below. */
export function PlaceBrowser({ title, places }: { title: string; places: BrowserPlace[] }) {
  const [openId, setOpenId] = useState(places[0]?.id ?? null);
  const [recent, setRecent] = useState<string[]>(openId ? [openId] : []);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function open(id: string) {
    setOpenId(id);
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, KEEP_FRAMES));
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const current = places.find((p) => p.id === openId);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <h1 className="min-w-0 flex-1 truncate font-bold">{title}</h1>
        <span className="shrink-0 text-sm text-muted">{selected.size > 0 ? `${selected.size}곳 선택` : "가고 싶은 곳을 골라 주세요"}</span>
      </header>

      {places.length === 0 ? (
        <p className="m-auto px-6 text-center text-muted">아직 추가된 장소가 없어요.</p>
      ) : (
        <>
          <ul className="flex shrink-0 snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 py-2 [scrollbar-width:none]">
            {places.map((p) => {
              const isOpen = p.id === openId;
              const isSelected = selected.has(p.id);
              return (
                <li
                  key={p.id}
                  className={`flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-xl border-2 bg-background ${isOpen ? "border-foreground" : "border-line"}`}
                >
                  <button onClick={() => open(p.id)} aria-current={isOpen} className="text-left">
                    <PlaceThumb provider={p.provider} title={p.title} src={p.thumbnailUrl} className="h-16 w-full" />
                    <div className="px-2 pt-1.5">
                      <ProviderBadge provider={p.provider} />
                      <p className="mt-1 line-clamp-2 h-10 text-sm font-medium leading-5">{p.title}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => toggle(p.id)}
                    aria-pressed={isSelected}
                    className={`m-2 rounded-lg py-1.5 text-sm font-semibold ${isSelected ? "bg-accent text-white" : "border border-line"}`}
                  >
                    {isSelected ? "✓ 선택됨" : "선택"}
                  </button>
                </li>
              );
            })}
          </ul>

          {current && (
            <div className="flex shrink-0 items-center gap-2 border-y border-line px-4 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-muted">{current.title}</span>
              <a href={current.openUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium text-accent">
                {current.provider === "google" ? "구글 지도에서 보기" : "앱에서 열기"} ↗
              </a>
            </div>
          )}

          <section className="relative min-h-0 flex-1 bg-surface" aria-label="장소 정보">
            {places
              .filter((p) => recent.includes(p.id))
              .map((p) => (
                <iframe
                  key={p.id}
                  src={p.embedUrl}
                  title={p.title}
                  // No allow-top-navigation: the embedded page can't navigate away from the app.
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                  onLoad={() => setLoaded((s) => new Set(s).add(p.id))}
                  className={`absolute inset-0 h-full w-full border-0 bg-white ${p.id === openId ? "" : "invisible"}`}
                />
              ))}
            {current && !loaded.has(current.id) && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">불러오는 중…</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
