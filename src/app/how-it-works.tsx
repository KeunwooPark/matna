import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Provider } from "@/db/schema";
import { PlaceThumb, ProviderBadge } from "@/components/provider-badge";
import { OG_IMAGE } from "@/lib/site";

const PROVIDERS: Provider[] = ["naver", "kakao", "google", "catchtable"];

// Made-up example data for the illustrations. `before` is the count shown before "my" vote rolls it up.
const SAMPLE: { provider: Provider; title: string; votes: number; before?: number }[] = [
  { provider: "naver", title: "을지로 골뱅이", votes: 3, before: 2 },
  { provider: "kakao", title: "스시 하루", votes: 1 },
  { provider: "google", title: "마포 갈비", votes: 2 },
];

/**
 * Scroll-driven entrance for one piece of an illustration (see `.how-anim` in globals.css).
 * `range` is a slice of the step's view timeline, e.g. "entry 10% entry 40%" plays while
 * the step goes from 10% to 40% scrolled into the viewport. Without support, or with reduced
 * motion, nothing animates and the finished picture shows.
 */
function anim(keyframes: "rise" | "drop" | "pop" | "draw" | "roll", range: string): CSSProperties {
  return { "--how-kf": `how-${keyframes}`, "--how-range": range } as CSSProperties;
}

/** Three-step visual overview for the home page, drawn with the app's own UI pieces. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="flex flex-col gap-9">
      <h2 id="how-it-works-title" className="-mb-3 text-xl font-extrabold">
        사용 방법
      </h2>

      <Step n={1} title="지도 링크를 붙여 넣고">
        <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-surface p-4" aria-hidden>
          <div
            className="how-anim flex items-center gap-2 self-stretch rounded-lg border border-dashed border-accent bg-background px-3 py-2.5"
            style={anim("rise", "entry 5% entry 35%")}
          >
            <LinkIcon className="h-4 w-4 text-accent" />
            <span className="font-mono text-sm text-muted">naver.me/5xKd2Q</span>
          </div>
          <svg
            viewBox="0 0 24 24"
            className="how-anim h-5 w-5 text-muted"
            style={anim("drop", "entry 30% entry 50%")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
          <div
            className="how-anim flex items-center gap-3 self-stretch rounded-xl border border-line bg-background p-2.5"
            style={anim("drop", "entry 45% entry 80%")}
          >
            <PlaceThumb provider="naver" title="을지로 골뱅이" src={null} className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="flex flex-col items-start gap-1">
              <span className="font-bold">을지로 골뱅이</span>
              <ProviderBadge provider="naver" />
            </div>
          </div>
        </div>
        <ul className="flex justify-center gap-1.5" aria-label="지원하는 지도 서비스">
          {PROVIDERS.map((p, i) => (
            <li key={p} className="how-anim" style={anim("pop", `entry ${70 + i * 7}% entry ${85 + i * 5}%`)}>
              <ProviderBadge provider={p} />
            </li>
          ))}
        </ul>
      </Step>

      <Step n={2} title="단톡방에 공유하면">
        <div className="flex flex-col gap-1.5 rounded-2xl bg-chat p-4" aria-hidden>
          <span className="how-anim pl-11 text-xs text-muted" style={anim("rise", "entry 10% entry 30%")}>
            민지
          </span>
          <div className="flex items-start gap-2">
            <div className="how-anim h-9 w-9 shrink-0 rounded-[14px] bg-line" style={anim("pop", "entry 10% entry 30%")} />
            <div className="flex min-w-0 flex-col gap-1.5">
              <p
                className="how-anim origin-top-left self-start rounded-[4px_14px_14px_14px] bg-background px-3 py-2 text-sm"
                style={anim("pop", "entry 20% entry 40%")}
              >
                여기 중에 골라줘!
              </p>
              <div
                className="how-anim w-60 max-w-full origin-top-left overflow-hidden rounded-[4px_14px_14px_14px] bg-background"
                style={anim("pop", "entry 45% entry 75%")}
              >
                {/* The real share image, so the preview looks like what people will see in the chat. */}
                <Image src={OG_IMAGE.url} width={OG_IMAGE.width} height={OG_IMAGE.height} sizes="240px" alt="" className="h-auto w-full" />
                <div className="flex flex-col gap-0.5 px-3 py-2.5">
                  <span className="text-sm font-bold">금요일 저녁 회식</span>
                  <span className="text-xs text-muted">후보 3곳: 을지로 골뱅이, 스시 하루, 마포 갈비</span>
                  <span className="text-[11px] text-muted">matna.space</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Step>

      <Step n={3} title="같이 투표해요">
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4" aria-hidden>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE.map((s) => (
              <div key={s.title} className="relative flex min-w-0 flex-col gap-1.5 rounded-xl border border-line bg-background p-[9px]">
                <PlaceThumb provider={s.provider} title={s.title} src={null} className="h-14 rounded-lg" />
                <span className="truncate text-[13px] font-bold">{s.title}</span>
                {s.before === undefined ? (
                  <VotePill votes={s.votes} />
                ) : (
                  <>
                    {/* "My" pick: the accent ring draws in and the count rolls up from `before`. */}
                    <div
                      className="how-anim pointer-events-none absolute -inset-px rounded-xl border-2 border-accent"
                      style={anim("draw", "entry 40% entry 65%")}
                    />
                    <div className="h-[22px] self-start overflow-hidden">
                      <div className="how-anim flex -translate-y-1/2 flex-col items-start" style={anim("roll", "entry 50% entry 75%")}>
                        <VotePill votes={s.before} />
                        <VotePill votes={s.votes} mine />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              <Avatar className="bg-amber-200 text-black">민</Avatar>
              <Avatar className="-ml-1.5 bg-blue-200 text-black">준</Avatar>
              <Avatar className="how-anim -ml-1.5 bg-accent text-white" style={anim("pop", "entry 70% entry 90%")}>
                나
              </Avatar>
            </div>
            <span className="text-[13px] text-muted">실시간으로 표가 모여요</span>
          </div>
        </div>
      </Step>
    </section>
  );
}

/** One step; its view timeline (`.how-step`) drives the animations inside it. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="how-step flex flex-col gap-3">
      <h3 className="flex items-center gap-2.5 text-lg font-bold">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent-soft text-sm font-extrabold text-accent-ink">{n}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function VotePill({ votes, mine = false }: { votes: number; mine?: boolean }) {
  return (
    <span
      className={`flex h-[22px] items-center gap-0.5 rounded-full px-2 text-xs font-bold ${mine ? "bg-accent text-white" : "bg-surface text-muted"}`}
    >
      {mine && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
      {votes}표
    </span>
  );
}

function Avatar({ className, style, children }: { className: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[11px] font-bold ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}
