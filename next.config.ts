import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Let phones on the tailnet use the dev server through its MagicDNS name.
  allowedDevOrigins: ["**.ts.net"],
  partialPrefetching: true,
  // Link-preview scrapers that get metadata in <head> instead of streamed. This replaces Next's
  // default list, so it repeats it and adds KakaoTalk's scraper, Daum's crawler and Telegram (Naver's
  // crawler, Yeti, is already in it). Don't add bare "Kakao" or "naver": the in-app browsers real users
  // open links in carry those words.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|kakaotalk-scrap|Daumoa|TelegramBot/i,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
