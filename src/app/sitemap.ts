import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the home page is public. Event pages are private links marked noindex.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", SITE_URL).href, changeFrequency: "monthly", priority: 1 }];
}
