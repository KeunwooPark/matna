import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getEvent, getPlaces } from "@/lib/events";
import { APP_NAME, OG_IMAGE } from "@/lib/site";
import { getParticipant, getTally } from "@/lib/votes";
import { PlaceBrowser } from "./place-browser";

/** The preview KakaoTalk and other messengers show for a shared event link. */
export async function generateMetadata({ params }: PageProps<"/e/[id]">): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "모임을 찾을 수 없어요" };
  const list = await getPlaces(id);
  const title = event.title;
  const names = list.map((p) => p.title);
  const description =
    names.length === 0
      ? "어디서 만날까? 장소 후보를 준비하고 있어요."
      : `어디서 만날까? 후보 ${names.length}곳 중 가고 싶은 곳을 골라 주세요. ${names.slice(0, 3).join(", ")}${names.length > 3 ? " 외" : ""}`;
  return { title, description, openGraph: { title: `${title} · ${APP_NAME}`, description, siteName: APP_NAME, type: "website", locale: "ko_KR", images: OG_IMAGE } };
}

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
  if (!event) {
    return (
      <div className="m-auto px-6 text-center">
        <h1 className="text-xl font-bold">모임을 찾을 수 없어요</h1>
        <p className="mt-2 text-muted">링크가 잘렸거나 잘못 복사되었을 수 있어요. 받은 링크 전체를 다시 열어 보세요.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
          새 모임 만들기
        </Link>
      </div>
    );
  }
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
        addedBy: p.addedByName,
      }))}
    />
  );
}
