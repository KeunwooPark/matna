import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Crawling stays open on purpose. Event pages opt out with a noindex meta tag,
// and crawlers only see that tag if they're allowed to fetch the page.
// Blocking /e/ here could still get bare event URLs listed from outside links.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", SITE_URL).href,
  };
}
