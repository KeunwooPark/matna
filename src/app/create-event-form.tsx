"use client";

import { useActionState } from "react";
import { createEvent, type FormState } from "./actions";

export function CreateEventForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createEvent, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="title" className="text-sm font-medium">
        모임 이름
      </label>
      <input
        id="title"
        name="title"
        required
        maxLength={60}
        placeholder="예: 금요일 저녁 회식"
        className="rounded-xl border border-line bg-background px-4 py-3 text-base"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "만드는 중…" : "모임 만들기"}
      </button>
    </form>
  );
}
