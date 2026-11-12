"use client";

import { CopyLink } from "@/components/copy-link";
import { APP_NAME, TAGLINE } from "@/lib/site";

/** Bottom sheet that says what the app is and how to come back to it to start another event. */
export function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="about-sheet-title"
        className="w-full max-w-md rounded-t-2xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <h2 id="about-sheet-title" className="text-lg font-bold">
          {APP_NAME}
        </h2>
        <p className="mt-1 text-muted">{TAGLINE}</p>
        <p className="mt-4 text-sm">다음 모임 장소를 정할 때도 이 주소에서 바로 만들 수 있어요. 가입은 필요 없어요.</p>
        <div className="mt-2">
          <CopyLink path="/" label={`${APP_NAME} 주소`} share={{ title: APP_NAME, text: TAGLINE, button: "나에게 보내기" }} />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {/* A new tab, so the event this person is voting on stays open. */}
          <a href="/" target="_blank" className="rounded-xl border border-line py-3 text-center font-semibold">
            새 모임 만들기 ↗
          </a>
          <button onClick={onClose} className="rounded-xl border border-line py-3 font-medium">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
