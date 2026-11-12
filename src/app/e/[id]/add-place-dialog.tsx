"use client";

import { useActionState, useRef, useState } from "react";

type State = { error: string | null; value: string };

/** Lets a participant paste a map link to add a place. */
export function AddPlaceDialog({
  onSubmit,
  onClose,
}: {
  /** Returns an error message, or null on success. */
  onSubmit: (input: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Clipboard reading needs a secure context and isn't in every in-app browser.
  const [canPaste] = useState(() => typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  const [pasteFailed, setPasteFailed] = useState(false);
  const [state, submit, pending] = useActionState<State, FormData>(
    async (_prev, form) => {
      const value = String(form.get("link") ?? "");
      return { error: await onSubmit(value), value };
    },
    { error: null, value: "" },
  );

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (textRef.current && text) textRef.current.value = text;
      setPasteFailed(!text);
    } catch {
      setPasteFailed(true);
    }
  }

  return (
    // Sits near the top so the phone keyboard doesn't cover it.
    <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/40 px-4 pt-16" onClick={onClose}>
      <form
        action={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="add-place-title"
        className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
      >
        <h2 id="add-place-title" className="text-lg font-bold">
          장소 추가
        </h2>
        <p className="mt-1 text-sm text-muted">네이버 지도, 카카오맵, 구글 지도에서 공유 링크를 복사해 붙여 넣으세요.</p>
        {/* React resets the form after each action; refill it on error so the paste isn't lost. */}
        <textarea
          ref={textRef}
          name="link"
          key={state.value}
          defaultValue={state.value}
          rows={3}
          required
          autoFocus
          placeholder="예: https://naver.me/…"
          className="mt-4 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base"
        />
        {canPaste && (
          <button type="button" onClick={() => void paste()} className="mt-1 text-sm font-medium text-accent">
            복사한 링크 붙여넣기
          </button>
        )}
        {pasteFailed && <p className="mt-1 text-sm text-muted">붙여넣지 못했어요. 입력칸을 길게 눌러 붙여 넣어 주세요.</p>}
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line py-2.5 font-medium">
            취소
          </button>
          <button disabled={pending} className="flex-1 rounded-xl bg-accent py-2.5 font-semibold text-white disabled:opacity-60">
            {pending ? "가져오는 중…" : "추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
