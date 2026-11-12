"use client";

import { useState } from "react";
import { PlaceThumb, ProviderBadge } from "@/components/provider-badge";
import type { BrowserPlace } from "./place-browser";

/** Bottom sheet with a place's details and the delete button. Warns when people have picked it. */
export function PlaceSheet({
  place: p,
  voters,
  onDelete,
  onClose,
}: {
  place: BrowserPlace;
  /** Display names of everyone who picked it, "나" first if this participant did. */
  voters: string[];
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="place-sheet-title"
        className="w-full max-w-md rounded-t-2xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <div className="flex gap-3">
          <PlaceThumb provider={p.provider} title={p.title} src={p.thumbnailUrl} className="h-14 w-14 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <ProviderBadge provider={p.provider} />
            <h2 id="place-sheet-title" className="mt-1 truncate font-bold">
              {p.title}
            </h2>
            <p className="text-sm text-muted">{p.addedBy ? `${p.addedBy}님이 추가했어요` : "모임을 만든 사람이 추가했어요"}</p>
          </div>
        </div>
        {voters.length > 0 && (
          <p className="mt-4 rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-fg">
            {voters.join(", ")} {voters.length}명이 고른 곳이에요. 삭제하면 모두의 후보에서 사라져요.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await onDelete();
              setPending(false);
            }}
            className="rounded-xl border border-red-600/40 py-3 font-semibold text-red-600 disabled:opacity-60"
          >
            {pending ? "삭제하는 중…" : "후보에서 삭제"}
          </button>
          <button onClick={onClose} className="rounded-xl border border-line py-3 font-medium">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
