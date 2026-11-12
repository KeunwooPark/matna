"use client";

import { useActionState } from "react";
import { PlaceLinkFields } from "@/components/place-link-fields";

type State = { error: string | null; value: string; name?: string };

/** Lets a participant paste a map link to add a place. */
export function AddPlaceDialog({
  onSubmit,
  onClose,
}: {
  /** Returns an error message, or null on success. */
  onSubmit: (input: string, name?: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [state, submit, pending] = useActionState<State, FormData>(
    async (_prev, form) => {
      const value = String(form.get("link") ?? "");
      const name = form.get("name");
      const typed = typeof name === "string" ? name : undefined;
      return { error: await onSubmit(value, typed), value, name: typed };
    },
    { error: null, value: "" },
  );

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
        <p className="mt-1 text-sm text-muted">네이버 지도, 카카오맵, 구글 지도, 캐치테이블에서 공유 링크를 복사해 붙여 넣으세요.</p>
        <div className="mt-4 flex flex-col gap-1">
          {/* React resets the form after each action; refill it on error so the paste isn't lost. */}
          <PlaceLinkFields
            key={`${state.value}\0${state.name ?? ""}`}
            defaultLink={state.value}
            defaultName={state.name}
            placeholder="예: https://naver.me/…"
            autoFocus
            pasteButton
            className="bg-surface px-3 py-2.5"
          />
        </div>
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
