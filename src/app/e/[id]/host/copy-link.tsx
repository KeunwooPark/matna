"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** Shows the full share URL for `path`, copies it, and opens the phone's share sheet where there is one. */
export function CopyLink({ path, title }: { path: string; title: string }) {
  // The origin is only known in the browser; the server renders the bare path.
  const url = useSyncExternalStore(
    noSubscribe,
    () => location.origin + path,
    () => path,
  );
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("이 링크를 복사하세요", url);
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text: `${title} — 어디서 만날까? 가고 싶은 곳을 골라 주세요.`, url });
    } catch {
      // Cancelled by the user, or not allowed here: nothing to do.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm" />
        <button onClick={copy} className="shrink-0 rounded-xl border border-line px-4 py-2 text-sm font-medium">
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      {canShare && (
        <button onClick={share} className="rounded-xl bg-accent py-2.5 font-semibold text-white">
          카카오톡 등으로 공유하기
        </button>
      )}
    </div>
  );
}
