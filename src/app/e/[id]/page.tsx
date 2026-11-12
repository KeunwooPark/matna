import { Suspense } from "react";
import { getEvent, getPlaces } from "@/lib/events";
import { getParticipant, getTally } from "@/lib/votes";
import { PlaceBrowser } from "./place-browser";

export default function EventPage({ params }: PageProps<"/e/[id]">) {
  return (
    // Fixed to the viewport so the outer page never scrolls; only the viewer and the card strip scroll.
    <main className="fixed inset-0 flex flex-col overflow-hidden overscroll-none">
      <Suspense fallback={<p className="m-auto text-muted">불러오는 중…</p>}>
        <EventView params={params} />
      </Suspense>
    </main>
  );
}

async function EventView({ params }: Pick<PageProps<"/e/[id]">, "params">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return <p className="m-auto px-6 text-center">모임을 찾을 수 없어요. 링크를 확인해 주세요.</p>;
  const [list, tally] = await Promise.all([getPlaces(id), getParticipant(id).then((me) => getTally(id, me))]);
  return (
    <PlaceBrowser
      eventId={id}
      title={event.title}
      initialTally={tally}
      places={list.map((p) => ({
        id: p.id,
        provider: p.provider,
        title: p.title,
        thumbnailUrl: p.thumbnailUrl,
        embedUrl: p.embedUrl,
        openUrl: p.openUrl,
      }))}
    />
  );
}
