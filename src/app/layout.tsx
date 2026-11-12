import type { Metadata, Viewport } from "next";
import { APP_NAME, OG_IMAGE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute URLs for the share image. SITE_URL is the public origin, e.g. https://matna.example.
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  // Pages that set a title get "<title> · 여기서맛나".
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "어디서 만날까? 모임 장소 후보를 모아 함께 골라요.",
  openGraph: { siteName: APP_NAME, type: "website", locale: "ko_KR", images: OG_IMAGE },
  twitter: { card: "summary_large_image" },
  // Event pages are private links; keep everything out of search engines.
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
