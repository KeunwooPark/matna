import { Suspense } from "react";
import { getEvent, getPlaces } from "@/lib/events";

// Placeholder until step 3 (participant page with card strip and in-app viewer).
export default function EventPage({ params }: PageProps<"/e/[id]">) {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Suspense fallback={<p className="text-muted">불러오는 중…</p>}>
        <EventView params={params} />
      </Suspense>
    </main>
  );
}

async function EventView({ params }: Pick<PageProps<"/e/[id]">, "params">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return <p>모임을 찾을 수 없어요. 링크를 확인해 주세요.</p>;
  const list = await getPlaces(id);
  return (
    <div>
      <h1 className="text-2xl font-bold">{event.title}</h1>
      <ul className="mt-4 list-disc pl-5">
        {list.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </div>
  );
}
