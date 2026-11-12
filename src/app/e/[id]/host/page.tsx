import { Suspense } from "react";
import { addPlace, restorePlace, setGuestsCanEdit } from "@/app/actions";
import { getEventAsHost, getPlaces } from "@/lib/events";
import { getDeletedPlaces } from "@/lib/places";
import { countParticipants, getTally } from "@/lib/votes";
import { AutoRefresh } from "./auto-refresh";
import { AddPlaceForm } from "./add-place-form";
import { CopyLink } from "./copy-link";
import { HostPlaceItem } from "./host-place-item";
import { RestoreButton } from "./restore-button";

export default function HostPage({ params, searchParams }: PageProps<"/e/[id]/host">) {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Suspense fallback={<p className="text-muted">불러오는 중…</p>}>
        <HostView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HostView({ params, searchParams }: Pick<PageProps<"/e/[id]/host">, "params" | "searchParams">) {
  const { id } = await params;
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : undefined;
  const event = await getEventAsHost(id, token);
  if (!event || !token) {
    return (
      <div>
        <h1 className="text-xl font-bold">링크를 확인해 주세요</h1>
        <p className="mt-2 text-muted">모임이 없거나 관리자 링크가 올바르지 않아요.</p>
      </div>
    );
  }
  const [list, tally, joined, deleted] = await Promise.all([getPlaces(id), getTally(id, null), countParticipants(id), getDeletedPlaces(id)]);
  const voteCount = (placeId: string) => tally.others[placeId]?.length ?? 0;
  const most = Math.max(0, ...list.map((p) => voteCount(p.id)));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted">관리자 화면</p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </header>

      {/* There are no accounts: losing this URL means losing the ability to edit, so this is a warning, not a caption. */}
      <section role="note" aria-labelledby="host-link-title" className="flex flex-col gap-3 rounded-2xl border-2 border-warn-line bg-warn-bg p-4">
        <div className="flex gap-3">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="mt-0.5 h-6 w-6 shrink-0 text-warn-fg"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.3 3.9L2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4.5M12 17h.01" />
          </svg>
          <div className="flex flex-col gap-1">
            <h2 id="host-link-title" className="font-bold text-warn-fg">
              이 관리자 링크를 꼭 저장하세요
            </h2>
            <p className="text-sm">
              장소를 추가하거나 고치려면 지금 보고 있는 이 페이지 주소가 필요해요. 로그인이 없어서 링크를 잃어버리면 다시 찾을 수 없어요.
            </p>
          </div>
        </div>
        <CopyLink
          path={`/e/${id}/host?t=${token}`}
          label="관리자 링크"
          share={{ title: `${event.title} 관리자 링크`, text: `${event.title} 관리자 링크예요. 장소를 고칠 때 필요해요.`, button: "나에게 보내기" }}
        />
        <p className="text-sm text-warn-fg">이 링크는 참가자에게 보내지 마세요. 이 링크가 있으면 누구나 장소를 바꿀 수 있어요.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">참가자에게 공유할 링크</h2>
        <CopyLink
          path={`/e/${id}`}
          label="참가자 링크"
          share={{ title: event.title, text: `${event.title}, 어디서 만날까? 가고 싶은 곳을 골라 주세요.`, button: "카카오톡 등으로 공유하기" }}
        />
        <a href={`/e/${id}`} target="_blank" className="text-sm font-medium text-accent">
          참가자 화면 열기 ↗
        </a>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">장소 추가</h2>
        <AddPlaceForm action={addPlace.bind(null, id, token)} />
        <form action={setGuestsCanEdit.bind(null, id, token, !event.guestsCanEdit)} className="flex items-center gap-3 rounded-xl border border-line p-3">
          <div className="min-w-0 flex-1">
            <p id="guests-can-edit" className="text-sm font-medium">
              참가자도 장소를 추가·삭제할 수 있어요
            </p>
            <p className="text-xs text-muted">삭제된 장소는 아래 ‘최근 삭제된 장소’에서 언제든 복원할 수 있어요.</p>
          </div>
          <button
            role="switch"
            aria-checked={event.guestsCanEdit}
            aria-labelledby="guests-can-edit"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${event.guestsCanEdit ? "bg-accent" : "bg-line"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${event.guestsCanEdit ? "left-[1.375rem]" : "left-0.5"}`}
            />
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">장소 후보 {list.length}곳</h2>
          <span className="text-sm text-muted">참여 {joined}명</span>
        </div>
        <AutoRefresh />
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            아직 장소가 없어요. 지도 앱에서 공유 링크를 복사해 붙여 넣어 보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((p, i) => (
              <HostPlaceItem
                key={p.id}
                place={p}
                eventId={id}
                token={token}
                first={i === 0}
                last={i === list.length - 1}
                voters={tally.others[p.id] ?? []}
                leading={most > 0 && voteCount(p.id) === most}
              />
            ))}
          </ul>
        )}
      </section>

      {deleted.length > 0 && (
        <details className="flex flex-col gap-2">
          <summary className="cursor-pointer font-semibold">최근 삭제된 장소 {deleted.length}곳</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {deleted.map((d) => (
              <li key={d.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted">{d.deletedByName ? `${d.deletedByName}님이 삭제` : "내가 삭제"}</p>
                </div>
                <RestoreButton action={restorePlace.bind(null, id, token, d.id)} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
