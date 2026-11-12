"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

// Host links carry a secret token in `?t=`; never send it to analytics.
export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.searchParams.delete("t");
        return { ...event, url: url.toString() };
      }}
    />
  );
}
