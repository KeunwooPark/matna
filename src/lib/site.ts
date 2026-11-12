export const APP_NAME = "여기서맛나";

/** Public origin, e.g. https://matna.space. Read at build time for prerendered pages, the sitemap and robots.txt. */
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

/** Share-preview image; its source is design/og-image.html. */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: `${APP_NAME} 로고와 "어디서 만날까? 후보를 모아 같이 골라요" 문구, 투표 수가 보이는 장소 후보 카드 두 장`,
};

/** One-line pitch, shared by the default description and the home page. */
export const TAGLINE = "어디서 만날까? 모임 장소 후보를 모아 같이 골라요.";
