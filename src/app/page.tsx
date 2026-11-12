import type { Metadata } from "next";
import { APP_NAME, OG_IMAGE } from "@/lib/site";
import { CreateEventForm } from "./create-event-form";

const title = "모임 장소, 투표로 같이 정하기";
const description =
  "어디서 만날까? 네이버 지도·카카오맵·구글 지도 링크로 맛집과 모임 장소 후보를 모으고, 링크 하나로 공유해 같이 골라요. 가입 없이 바로 시작해요.";

// The only page search engines may index. Metadata merges shallowly, so
// openGraph and robots are restated here in full.
// The layout's title template doesn't apply to a page in the same segment, so
// the full title is spelled out.
export const metadata: Metadata = {
  title: { absolute: `${title} · ${APP_NAME}` },
  description,
  alternates: { canonical: "/" },
  openGraph: { title: `${title} · ${APP_NAME}`, description, url: "/", siteName: APP_NAME, type: "website", locale: "ko_KR", images: OG_IMAGE },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-12">
      <div className="flex flex-1 flex-col justify-center gap-8 pb-12">
        <div>
          <h1 className="text-3xl font-bold">{APP_NAME}</h1>
          <p className="mt-2 text-muted">장소 후보를 모으고, 링크를 공유하고, 같이 골라요.</p>
        </div>
        <CreateEventForm />
      </div>
      <footer className="text-center text-xs text-muted">
        © 2026 Keunwoo Park ·{" "}
        <a href="https://github.com/KeunwooPark/matna" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          GitHub
        </a>
      </footer>
    </main>
  );
}
