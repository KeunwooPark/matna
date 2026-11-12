import type { Metadata, Viewport } from "next";
import { APP_NAME, OG_IMAGE, SITE_URL, TAGLINE } from "@/lib/site";
import { Analytics } from "./analytics";
import "./globals.css";

export const metadata: Metadata = {
  // Makes the share image and canonical URLs absolute.
  metadataBase: new URL(SITE_URL),
  // Pages that set a title get "<title> · 여기서맛나".
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: TAGLINE,
  openGraph: { siteName: APP_NAME, type: "website", locale: "ko_KR", images: OG_IMAGE },
  twitter: { card: "summary_large_image" },
  // Event pages are private links; keep them out of search engines.
  // The home page overrides this to be indexable.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
