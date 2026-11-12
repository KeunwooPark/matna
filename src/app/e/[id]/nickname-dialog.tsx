"use client";

import { useActionState } from "react";

type State = { error: string | null; value: string };

/** Asks for the name other participants will see next to this person's picks. */
export function NicknameDialog({
  initial,
  onSubmit,
  onClose,
}: {
  initial: string;
  /** Returns an error message, or null on success. */
  onSubmit: (nickname: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [state, submit, pending] = useActionState<State, FormData>(
    async (_prev, form) => {
      const value = String(form.get("nickname") ?? "");
      return { error: await onSubmit(value), value };
    },
    { error: null, value: initial },
  );

  return (
    // Sits near the top so the phone keyboard doesn't cover it.
    <div className="fixed inset-0 z-10 flex items-start justify-center bg-black/40 px-4 pt-24" onClick={onClose}>
      <form
        action={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="nickname-title"
        className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
      >
        <h2 id="nickname-title" className="text-lg font-bold">
          {initial ? "이름 바꾸기" : "이름을 알려 주세요"}
        </h2>
        <p className="mt-1 text-sm text-muted">누가 어디를 골랐는지 모두에게 보여요.</p>
        <input
          name="nickname"
          defaultValue={state.value}
          key={state.value}
          maxLength={20}
          autoFocus
          required
          placeholder="예: 민수"
          className="mt-4 w-full rounded-xl border border-line bg-surface px-3 py-2.5"
        />
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line py-2.5 font-medium">
            취소
          </button>
          <button disabled={pending} className="flex-1 rounded-xl bg-accent py-2.5 font-semibold text-white disabled:opacity-60">
            {pending ? "저장 중…" : "확인"}
          </button>
        </div>
      </form>
    </div>
  );
}
