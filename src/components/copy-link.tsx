"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

type Props = {
  path: string;
  /** Name for the field, read by screen readers. */
  label: string;
  /** When set, a button opens the phone's share sheet (where there is one) with this text. */
  share?: { title: string; text: string; button: string };
};

/** Shows the full URL for `path` with a copy button, and optionally a share-sheet button. */
export function CopyLink({ path, label, share }: Props) {
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

  async function openShareSheet() {
    if (!share) return;
    try {
      await navigator.share({ title: share.title, text: share.text, url });
    } catch {
      // Cancelled by the user, or not allowed here: nothing to do.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label={label}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-xl border border-line bg-background px-3 py-2 text-sm"
        />
        <button onClick={copy} className="shrink-0 rounded-xl border border-line bg-background px-4 py-2 text-sm font-medium">
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      {share && canShare && (
        <button onClick={openShareSheet} className="rounded-xl bg-accent py-2.5 font-semibold text-white">
          {share.button}
        </button>
      )}
    </div>
  );
}
