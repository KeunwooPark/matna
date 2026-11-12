"use client";

import { useEffect, useRef, useState } from "react";
import type { Provider } from "@/db/schema";
import type { Tally } from "@/lib/votes";
import { AppLogo } from "@/components/app-logo";
import { PlaceThumb, ProviderBadge } from "@/components/provider-badge";
import { APP_NAME } from "@/lib/site";
import { AboutSheet } from "./about-sheet";
import { deletePlace, joinEvent, suggestPlace, undoDeletePlace, type EditError } from "./actions";
import { AddPlaceDialog } from "./add-place-dialog";
import { NicknameDialog } from "./nickname-dialog";
import { PlaceSheet } from "./place-sheet";
import { useVotes } from "./use-votes";

export type BrowserPlace = {
  id: string;
  provider: Provider;
  title: string;
  thumbnailUrl: string | null;
  embedUrl: string;
  openUrl: string;
  /** Nickname of the participant who added it; null when the host did. */
  addedBy: string | null;
};

/** What to do once the participant has given a nickname. */
type AfterJoin = { kind: "vote"; id: string } | { kind: "add" } | { kind: "delete"; id: string };
type Toast = { message: string; undoId?: string };

// Recently opened places keep their iframe (hidden) so going back to one doesn't reload it.
const KEEP_FRAMES = 4;
const TOAST_MS = 3000;
const UNDO_MS = 6000;

/** Participant view: a horizontal strip of cards on top, the open place's page below. */
export function PlaceBrowser({ eventId, title, places, initialTally }: { eventId: string; title: string; places: BrowserPlace[]; initialTally: Tally }) {
  const [openId, setOpenId] = useState(places[0]?.id ?? null);
  const [recent, setRecent] = useState<string[]>(openId ? [openId] : []);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [folded, setFolded] = useState(false);
  // Open while asking for a nickname; `then` is what to do once joined.
  const [asking, setAsking] = useState<{ then: AfterJoin | null } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [adding, setAdding] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  // Places this participant deleted, so their own delete isn't reported back to them as someone else's.
  const [myDeletes, setMyDeletes] = useState<Set<string>>(new Set());
  // A place to scroll into view once its card is rendered (set after adding one).
  const scrollTarget = useRef<string | null>(null);
  const { tally, isSelected, vote, setMe, refetch } = useVotes(
    eventId,
    initialTally,
    places.map((p) => p.id),
  );
  const me = tally.me;
  const canEdit = tally.guestsCanEdit;

  function open(id: string) {
    setOpenId(id);
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, KEEP_FRAMES));
  }

  function flash(message: string, undoId?: string) {
    clearTimeout(toastTimer.current);
    setToast({ message, undoId });
    toastTimer.current = setTimeout(() => setToast(null), undoId ? UNDO_MS : TOAST_MS);
  }

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // After adding a place, bring its card into view once the refreshed list includes it.
  useEffect(() => {
    const id = scrollTarget.current;
    const card = id && document.getElementById(`card-${id}`);
    if (!card) return;
    scrollTarget.current = null;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, [places, openId]);

  /** Handles a failed add/delete: asks for a nickname, reports a lock, or shows the message. */
  function editFailed(result: EditError, then: AfterJoin): void {
    if (result.error === "join") {
      setMe(null);
      setAsking({ then });
    } else if (result.error === "locked") {
      flash("모임을 만든 사람이 장소 추가·삭제를 막아 두었어요.");
      void refetch();
    } else flash(result.message);
  }

  async function add(input: string): Promise<string | null> {
    const result = await suggestPlace(eventId, input).catch(() => ({ error: "message" as const, message: "연결이 끊겼어요. 다시 시도해 주세요." }));
    if ("id" in result) {
      setAdding(false);
      setFolded(false);
      scrollTarget.current = result.id;
      open(result.id);
      return null;
    }
    if (result.error === "message") return result.message;
    setAdding(false);
    editFailed(result, { kind: "add" });
    return null;
  }

  function startAdding() {
    if (!me) setAsking({ then: { kind: "add" } });
    else setAdding(true);
  }

  async function remove(id: string) {
    const title = places.find((p) => p.id === id)?.title ?? "장소";
    const result = await deletePlace(eventId, id).catch(() => ({ error: "message" as const, message: "삭제하지 못했어요. 다시 시도해 주세요." }));
    setMenuFor(null);
    if ("ok" in result) {
      setMyDeletes((s) => new Set(s).add(id));
      flash(`‘${title}’을(를) 삭제했어요.`, id);
    } else editFailed(result, { kind: "delete", id });
  }

  async function undo(id: string) {
    setToast(null);
    const result = await undoDeletePlace(eventId, id).catch(() => ({ error: "message" as const, message: "되돌리지 못했어요. 다시 시도해 주세요." }));
    if ("ok" in result) {
      setMyDeletes((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    } else if (result.error === "message") flash(result.message);
    else editFailed(result, { kind: "delete", id });
  }

  async function toggle(id: string) {
    if (!me) return setAsking({ then: { kind: "vote", id } });
    const result = await vote(id, !isSelected(id));
    if ("error" in result) {
      if (result.error === "join") {
        // The cookie was lost (e.g. cleared site data): ask again.
        setMe(null);
        setAsking({ then: { kind: "vote", id } });
      } else if (result.error === "place") flash("이 장소는 삭제되었어요.");
      else flash("저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  async function join(nickname: string): Promise<string | null> {
    const result = await joinEvent(eventId, nickname).catch(() => ({ error: "연결이 끊겼어요. 다시 시도해 주세요." }));
    if (result.error !== undefined) return result.error;
    setMe(result.nickname);
    const then = asking?.then;
    setAsking(null);
    if (then?.kind === "vote" && !isSelected(then.id)) void vote(then.id, true);
    else if (then?.kind === "add") setAdding(true);
    else if (then?.kind === "delete") void remove(then.id);
    return null;
  }

  // If the open place was deleted, fall back to the first one, and say who deleted it (unless it was this participant).
  const current = places.find((p) => p.id === openId) ?? places[0];
  const gone = openId && current?.id !== openId && !myDeletes.has(openId) ? tally.removed[openId] : undefined;
  const votersOf = (id: string) => [...(isSelected(id) ? ["나"] : []), ...(tally.others[id] ?? [])];
  const menuPlace = menuFor ? places.find((p) => p.id === menuFor) : undefined;
  const shownFrames = places.filter((p) => recent.includes(p.id) || p.id === current?.id);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          onClick={() => setAbout(true)}
          aria-label={`${APP_NAME} 소개`}
          className="-my-1 mr-1.5 flex shrink-0 items-center gap-1.5 rounded-lg py-1 transition-opacity active:opacity-60"
        >
          <AppLogo className="h-7 w-7" />
          <span className="text-base font-extrabold tracking-tight text-accent">{APP_NAME}</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate font-bold">{title}</h1>
        {me && (
          <button
            onClick={() => setAsking({ then: null })}
            aria-label="이름 바꾸기"
            className="max-w-[40%] shrink-0 truncate rounded-full border border-line px-3 py-1 text-sm"
          >
            {me.nickname} ✎
          </button>
        )}
      </header>

      {about && <AboutSheet onClose={() => setAbout(false)} />}
      {asking && <NicknameDialog initial={me?.nickname ?? ""} onSubmit={join} onClose={() => setAsking(null)} />}
      {adding && <AddPlaceDialog onSubmit={add} onClose={() => setAdding(false)} />}
      {menuPlace && <PlaceSheet place={menuPlace} voters={votersOf(menuPlace.id)} onDelete={() => remove(menuPlace.id)} onClose={() => setMenuFor(null)} />}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-6 z-30 flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg"
        >
          <p className={`min-w-0 flex-1 ${toast.undoId ? "" : "text-center"}`}>{toast.message}</p>
          {toast.undoId && (
            <button onClick={() => void undo(toast.undoId!)} className="shrink-0 font-bold text-accent">
              되돌리기
            </button>
          )}
        </div>
      )}

      {places.length === 0 ? (
        <div className="m-auto px-6 text-center">
          <p className="font-semibold">아직 장소 후보가 없어요</p>
          {canEdit ? (
            <>
              <p className="mt-1 text-sm text-muted">지도 앱에서 공유 링크를 복사해 첫 후보를 올려 보세요.</p>
              <button onClick={startAdding} className="mt-4 rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
                + 장소 추가
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">모임을 만든 사람이 장소를 추가하면 여기에 바로 나타나요.</p>
          )}
        </div>
      ) : (
        <>
          {/* Folding animates the row height from 1fr to 0fr; `inert` keeps hidden cards out of tab order. */}
          <div
            id="place-strip"
            inert={folded}
            className={`grid shrink-0 transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${folded ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
          >
            <div className="min-h-0 overflow-hidden">
              <ul className="flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 py-2 [scrollbar-width:none]">
                {places.map((p) => {
                  const isOpen = p.id === current?.id;
                  const selected = isSelected(p.id);
                  const voters = votersOf(p.id);
                  return (
                    <li
                      key={p.id}
                      id={`card-${p.id}`}
                      className={`relative flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-xl border-2 bg-background ${isOpen ? "border-foreground" : "border-line"}`}
                    >
                      <button onClick={() => open(p.id)} aria-current={isOpen} className="text-left">
                        <PlaceThumb provider={p.provider} title={p.title} src={p.thumbnailUrl} className="h-16 w-full" />
                        <div className="px-2 pt-1.5">
                          <div className="flex items-center gap-1">
                            <ProviderBadge provider={p.provider} />
                            {p.addedBy && <span className="min-w-0 truncate text-[11px] text-muted">{p.addedBy} 추가</span>}
                          </div>
                          <p className="mt-1 line-clamp-2 h-10 text-sm font-medium leading-5">{p.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted" data-testid="voters">
                            {voters.length > 0 ? (
                              <>
                                <b className="text-accent">{voters.length}명</b> · {voters.join(", ")}
                              </>
                            ) : (
                              "아직 아무도 안 골랐어요"
                            )}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => void toggle(p.id)}
                        aria-pressed={selected}
                        className={`m-2 rounded-lg py-1.5 text-sm font-semibold ${selected ? "bg-accent text-white" : "border border-line"}`}
                      >
                        {selected ? "✓ 선택됨" : "선택"}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => setMenuFor(p.id)}
                          aria-label={`${p.title} 메뉴`}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white"
                        >
                          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                      )}
                    </li>
                  );
                })}
                {canEdit && (
                  <li className="flex w-36 shrink-0 snap-start">
                    <button
                      onClick={startAdding}
                      className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-muted"
                    >
                      <span className="text-2xl leading-none">+</span>
                      <span className="text-sm font-semibold text-foreground">장소 추가</span>
                      <span className="text-xs">지도 링크 붙여넣기</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {current && (
            <div className="flex shrink-0 items-center gap-2 border-y border-line py-1.5 pl-3 pr-4 text-sm">
              <button
                onClick={() => setFolded((f) => !f)}
                aria-expanded={!folded}
                aria-controls="place-strip"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground py-1.5 pl-2.5 pr-3.5 font-semibold text-background shadow-sm active:scale-95"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform motion-reduce:transition-none ${folded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 15l6-6 6 6" />
                </svg>
                {folded ? `장소 ${places.length}곳 보기` : "목록 접기"}
              </button>
              <span className="min-w-0 flex-1 truncate text-muted">{current.title}</span>
              <a href={current.openUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium text-accent">
                {current.provider === "google" ? "구글 지도에서 보기" : "앱에서 열기"} ↗
              </a>
            </div>
          )}

          {gone && (
            <div role="status" className="flex shrink-0 items-center gap-2 bg-warn-bg px-4 py-2 text-sm text-warn-fg">
              <p className="min-w-0 flex-1">
                {gone.by ? `${gone.by}님이` : "모임을 만든 사람이"} ‘{gone.title}’을(를) 삭제했어요.
              </p>
              <button onClick={() => current && open(current.id)} className="shrink-0 font-semibold">
                확인
              </button>
            </div>
          )}

          <section className="relative min-h-0 flex-1 bg-surface" aria-label="장소 정보">
            {shownFrames.map((p) => (
              <iframe
                key={p.id}
                src={p.embedUrl}
                title={p.title}
                // No allow-top-navigation: the embedded page can't navigate away from the app.
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                referrerPolicy="no-referrer"
                onLoad={() => setLoaded((s) => new Set(s).add(p.id))}
                className={`absolute inset-0 h-full w-full border-0 bg-white ${p.id === current?.id ? "" : "invisible"}`}
              />
            ))}
            {current && !loaded.has(current.id) && <LoadingHint key={current.id} openUrl={current.openUrl} />}
          </section>
        </>
      )}
    </>
  );
}

const SLOW_MS = 8000;

/** Shown over the viewer until the place page loads; offers the app if it takes too long. */
function LoadingHint({ openUrl }: { openUrl: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted">
      <p>불러오는 중…</p>
      {slow && (
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto rounded-full border border-line bg-background px-4 py-2 font-medium text-foreground"
        >
          페이지가 안 열리면 앱에서 보기 ↗
        </a>
      )}
    </div>
  );
}
