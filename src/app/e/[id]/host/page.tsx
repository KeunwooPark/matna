import { Suspense } from "react";
import { addPlace } from "@/app/actions";
import { getEventAsHost, getPlaces } from "@/lib/events";
import { countParticipants, getTally } from "@/lib/votes";
import { AutoRefresh } from "./auto-refresh";
import { AddPlaceForm } from "./add-place-form";
import { CopyLink } from "./copy-link";
import { HostPlaceItem } from "./host-place-item";

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
  const [list, tally, joined] = await Promise.all([getPlaces(id), getTally(id, null), countParticipants(id)]);
  const voteCount = (placeId: string) => tally.others[placeId]?.length ?? 0;
  const most = Math.max(0, ...list.map((p) => voteCount(p.id)));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted">관리자 화면</p>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">참가자에게 공유할 링크</h2>
        <CopyLink path={`/e/${id}`} title={event.title} />
        <p className="text-xs text-muted">지금 보고 있는 이 페이지 주소는 관리자용이에요. 장소를 고치려면 이 주소를 따로 저장해 두세요.</p>
        <a href={`/e/${id}`} target="_blank" className="text-sm font-medium text-accent">
          참가자 화면 열기 ↗
        </a>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">장소 추가</h2>
        <AddPlaceForm action={addPlace.bind(null, id, token)} />
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
    </div>
  );
}
