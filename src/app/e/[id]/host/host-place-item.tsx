import { movePlace, removePlace, renamePlace } from "@/app/actions";
import { PlaceThumb, ProviderBadge } from "@/components/provider-badge";
import type { Place } from "@/db/schema";

type Props = { place: Place; eventId: string; token: string; first: boolean; last: boolean; voters: string[]; leading: boolean };

export function HostPlaceItem({ place: p, eventId, token, first, last, voters, leading }: Props) {
  const btn = "rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30";
  return (
    <li className="flex gap-3 rounded-xl border border-line p-3">
      <PlaceThumb provider={p.provider} title={p.title} src={p.thumbnailUrl} className="h-16 w-16 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <ProviderBadge provider={p.provider} />
          <a href={p.openUrl} target="_blank" rel="noreferrer" className="truncate font-medium underline-offset-2 hover:underline">
            {p.title}
          </a>
        </div>
        <p className="truncate text-xs text-muted" data-testid="host-voters">
          {voters.length > 0 ? (
            <>
              {leading && <span className="mr-1 rounded bg-accent px-1 py-0.5 font-bold text-white">최다</span>}
              <b className="text-accent">{voters.length}명</b> · {voters.join(", ")}
            </>
          ) : (
            "아직 고른 사람이 없어요"
          )}
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">이름 바꾸기</summary>
          <form action={renamePlace.bind(null, eventId, token, p.id)} className="mt-1 flex gap-1">
            <input name="title" defaultValue={p.title} maxLength={100} className="min-w-0 flex-1 rounded-lg border border-line bg-background px-2 py-1" />
            <button className={btn}>저장</button>
          </form>
        </details>
        <div className="mt-auto flex gap-1">
          <form action={movePlace.bind(null, eventId, token, p.id, -1)}>
            <button className={btn} disabled={first} aria-label="위로">
              ↑
            </button>
          </form>
          <form action={movePlace.bind(null, eventId, token, p.id, 1)}>
            <button className={btn} disabled={last} aria-label="아래로">
              ↓
            </button>
          </form>
          <form action={removePlace.bind(null, eventId, token, p.id)} className="ml-auto">
            <button className={`${btn} text-red-600`}>삭제</button>
          </form>
        </div>
      </div>
    </li>
  );
}
