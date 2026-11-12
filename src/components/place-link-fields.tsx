"use client";

import { useRef, useState } from "react";
import { catchtablePrefill } from "@/lib/resolve";

/**
 * The "paste a link" textarea, plus a name field that appears for CatchTable links: their pages
 * are rendered in the browser, so the server can't read the shop's name. The field is prefilled
 * (share text, else the URL slug) for the person to fix. Submits as `link` and `name`.
 * Uncontrolled, so the parent remounts it (with `key`) to reset or refill it.
 */
export function PlaceLinkFields({
  defaultLink = "",
  defaultName,
  placeholder,
  autoFocus,
  pasteButton,
  className = "px-3 py-2.5",
}: {
  defaultLink?: string;
  /** The name as last submitted, to refill after an error. */
  defaultName?: string;
  placeholder: string;
  autoFocus?: boolean;
  /** Show a "paste from clipboard" button. */
  pasteButton?: boolean;
  className?: string;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [link, setLink] = useState(defaultLink);
  // Clipboard reading needs a secure context and isn't in every in-app browser.
  const [canPaste] = useState(() => typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  const [pasteFailed, setPasteFailed] = useState(false);
  const [initialPrefill] = useState(() => catchtablePrefill(defaultLink));
  const prefill = catchtablePrefill(link);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (textRef.current && text) {
        textRef.current.value = text;
        setLink(text);
      }
      setPasteFailed(!text);
    } catch {
      setPasteFailed(true);
    }
  }

  return (
    <>
      <textarea
        ref={textRef}
        name="link"
        defaultValue={defaultLink}
        onChange={(e) => setLink(e.target.value)}
        rows={3}
        required
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-line text-base ${className}`}
      />
      {pasteButton && canPaste && (
        <button type="button" onClick={() => void paste()} className="self-start text-sm font-medium text-accent">
          복사한 링크 붙여넣기
        </button>
      )}
      {pasteFailed && <p className="text-sm text-muted">붙여넣지 못했어요. 입력칸을 길게 눌러 붙여 넣어 주세요.</p>}
      {prefill !== null && (
        <label className="mt-1 flex flex-col gap-1">
          <span className="text-sm font-medium">가게 이름</span>
          <input
            // A different link means a different shop: start again from its prefill.
            key={prefill}
            name="name"
            defaultValue={prefill === initialPrefill && defaultName !== undefined ? defaultName : prefill}
            required
            maxLength={100}
            placeholder="예: 우오보 하우스 광화문"
            className={`w-full rounded-xl border border-line text-base ${className}`}
          />
          <span className="text-xs text-muted">캐치테이블 링크는 가게 이름을 가져올 수 없어요. 맞게 고쳐 주세요.</span>
        </label>
      )}
    </>
  );
}
