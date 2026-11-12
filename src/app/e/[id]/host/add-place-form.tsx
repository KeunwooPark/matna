"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { PlaceLinkFields } from "@/components/place-link-fields";

export function AddPlaceForm({ action }: { action: (prev: FormState, form: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {/* React resets the form after each action; refill it on error so the host doesn't lose the paste. */}
      <PlaceLinkFields
        key={`${state.ok ?? 0}-${state.error ?? ""}`}
        defaultLink={state.error ? state.input : ""}
        defaultName={state.error ? state.name : undefined}
        placeholder={"네이버 지도, 카카오맵, 구글 지도, 캐치테이블의 공유 링크를 붙여 넣으세요.\n예: https://naver.me/…"}
        className="bg-background px-4 py-3"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "장소 정보를 가져오는 중…" : "추가"}
      </button>
    </form>
  );
}
