"use client";

import { useActionState } from "react";

/** Restores a deleted place, showing why if it can't (e.g. the same place was added again). */
export function RestoreButton({ action }: { action: () => Promise<{ error?: string }> }) {
  const [state, formAction, pending] = useActionState(() => action(), {});
  return (
    <form action={formAction} className="flex shrink-0 flex-col items-end">
      <button disabled={pending} className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-60">
        {pending ? "복원 중…" : "복원"}
      </button>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
