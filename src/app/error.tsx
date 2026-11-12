"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-bold">문제가 생겼어요</h1>
      <p className="mt-2 text-muted">잠시 후 다시 시도해 주세요.</p>
      <button onClick={() => retry()} className="mt-6 rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
        다시 시도
      </button>
    </main>
  );
}
