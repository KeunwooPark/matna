import type { Metadata } from "next";
import { APP_NAME, OG_IMAGE, TAGLINE } from "@/lib/site";
import { AppLogo } from "@/components/app-logo";
import { CreateEventForm } from "./create-event-form";
import { HowItWorks } from "./how-it-works";
import { RecentEvents } from "./recent-events";

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
      <div className="flex flex-1 flex-col gap-8 pb-12">
        <div>
          <div className="flex items-center gap-2.5">
            <AppLogo className="h-9 w-9" />
            <h1 className="text-3xl font-extrabold">{APP_NAME}</h1>
          </div>
          <p className="mt-2 text-muted">{TAGLINE}</p>
        </div>
        <div className="flex flex-col gap-3">
          <CreateEventForm />
          <p className="text-center text-[13px] text-muted">가입 없음 · 무료 · 링크 하나로 공유</p>
        </div>
        <RecentEvents />
        <hr className="border-line" />
        <HowItWorks />
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
