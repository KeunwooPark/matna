// Turns a pasted map link into something the app can show: provider, an iframe-safe URL,
// a URL to open in the provider's app, a title and a thumbnail.
// Only fetches hosts on the allowlist below, and checks every redirect hop, so the server
// can't be used to fetch arbitrary URLs.

export type Provider = "naver" | "kakao" | "google";

export type ResolvedPlace = {
  provider: Provider;
  originalUrl: string;
  embedUrl: string;
  openUrl: string;
  title: string;
  thumbnailUrl: string | null;
};

export class ResolveError extends Error {}

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAX_HOPS = 6;
const TIMEOUT_MS = 6000;

const HOSTS: Record<Provider, RegExp> = {
  naver: /^(naver\.me|(m\.)?map\.naver\.com|(m\.|pcmap\.)?place\.naver\.com)$/,
  kakao: /^(kko\.to|(m\.)?map\.kakao\.com|place\.map\.kakao\.com)$/,
  google: /^((www\.|maps\.)?google\.(com|co\.kr)|maps\.app\.goo\.gl|goo\.gl)$/,
};

const SHORT_HOSTS = /^(naver\.me|kko\.to|maps\.app\.goo\.gl|goo\.gl)$/;

function providerOf(url: URL): Provider | null {
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  for (const p of Object.keys(HOSTS) as Provider[]) if (HOSTS[p].test(url.hostname)) return p;
  return null;
}

/** Share text from the map apps often wraps the link in other text, e.g. "[네이버 지도]\n가게 이름\nhttps://naver.me/abc". */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0] : null;
}

/**
 * Guesses the place name from share text around the link, e.g. "[네이버 지도]\n삼육대학교\nhttps://…"
 * or "[카카오맵] 원조만선호프\n서울 중구 …\nhttps://…". Used only when the place page can't be read.
 */
export function nameFromShareText(text: string, url: string): string | null {
  for (const line of text.replace(url, "").split(/\r?\n/)) {
    const name = line.replace(/^\s*\[[^\]]*\]\s*/, "").trim();
    if (name && !/^https?:\/\//.test(name)) return name.slice(0, 100);
  }
  return null;
}

// --- Per-provider parsing of a URL that may already identify the place ---

function naverPlaceId(u: URL): string | null {
  if (u.hostname.endsWith("place.naver.com")) {
    // m.place.naver.com/{category}/{id}/home, pcmap.place.naver.com/{category}/{id}
    const m = u.pathname.match(/^\/[a-z]+\/(\d+)/);
    if (m) return m[1];
  }
  if (u.hostname.endsWith("map.naver.com")) {
    // map.naver.com/p/entry/place/{id}, /p/search/.../place/{id}, /v5/entry/place/{id}
    const m = u.pathname.match(/\/place\/(\d+)/);
    if (m) return m[1];
    const pin = u.searchParams.get("pinId");
    if (pin && /^\d+$/.test(pin)) return pin;
  }
  return null;
}

function kakaoPlaceId(u: URL): string | null {
  if (u.hostname === "place.map.kakao.com") {
    const m = u.pathname.match(/^\/(?:m\/)?(\d+)/);
    if (m) return m[1];
  }
  if (u.hostname.endsWith("map.kakao.com")) {
    for (const k of ["itemId", "id"]) {
      const v = u.searchParams.get(k);
      if (v && /^\d+$/.test(v)) return v;
    }
    const m = u.pathname.match(/\/link\/(?:map|to)\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

type GooglePlace = { name: string | null; lat?: string; lng?: string; cid?: string };

function googlePlace(u: URL): GooglePlace | null {
  if (!/google\./.test(u.hostname)) return null;
  if (!u.pathname.startsWith("/maps") && u.hostname !== "maps.google.com") return null;
  const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, " "));
  // The place's own coordinates are in the data segment (!3d lat !4d lng); @lat,lng is only the viewport.
  const pin = u.pathname.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const view = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const coords = pin ? { lat: pin[1], lng: pin[2] } : view ? { lat: view[1], lng: view[2] } : {};
  let m = u.pathname.match(/\/maps\/place\/([^/]+)/);
  if (m) return { name: decode(m[1]), ...coords };
  m = u.pathname.match(/\/maps\/search\/([^/]+)/);
  if (m) return { name: decode(m[1]), ...coords };
  const q = u.searchParams.get("q") ?? u.searchParams.get("query");
  if (q) return { name: q, ...coords };
  const cid = u.searchParams.get("cid");
  if (cid && /^\d+$/.test(cid)) return { name: null, cid };
  return null;
}

// --- Fetching ---

async function fetchAllowed(url: URL, provider: Provider): Promise<Response> {
  if (providerOf(url) !== provider) throw new ResolveError("지원하지 않는 링크로 이동했어요.");
  try {
    return await fetch(url, {
      redirect: "manual",
      // Without browser-like headers Naver answers 429 and Kakao 403.
      headers: {
        "user-agent": MOBILE_UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
        "sec-fetch-site": "none",
        "upgrade-insecure-requests": "1",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ResolveError("링크를 열 수 없어요. 잠시 후 다시 시도해 주세요.");
  }
}

/** Follows redirects (checking each hop) until `found` recognises the URL, or there are no more redirects. */
async function followUntil<T>(start: URL, provider: Provider, found: (u: URL) => T | null): Promise<{ url: URL; value: T | null }> {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const value = found(url);
    if (value) return { url, value };
    const res = await fetchAllowed(url, provider);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    // Some short-link pages redirect with a meta refresh or script instead of a 3xx.
    if (!SHORT_HOSTS.test(url.hostname)) return { url, value: null };
    const body = await res.text();
    const next = body.match(/(?:url=|location(?:\.href)?\s*=\s*)["']?(https?:\/\/[^"'\s>]+)/i);
    if (next) {
      const nu = new URL(decodeEntities(next[1]));
      if (providerOf(nu) === provider && nu.href !== url.href) {
        url = nu;
        continue;
      }
    }
    return { url, value: null };
  }
  throw new ResolveError("리다이렉트가 너무 많아요.");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Reads og:title / og:image from a page, whatever order the attributes are in. */
async function openGraph(url: URL, provider: Provider): Promise<{ title: string | null; image: string | null }> {
  let html = "";
  // Follow plain redirects (e.g. Naver /place/ → /restaurant/) on the same allowlist.
  let cur = url;
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetchAllowed(cur, provider).catch(() => null);
    if (!res) break;
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = new URL(loc, cur);
      continue;
    }
    if (res.ok) html = await res.text();
    break;
  }
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const prop = tag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
    if (prop && content !== undefined && !(prop in meta)) meta[prop] = decodeEntities(content);
  }
  let image: string | null = meta["og:image"] ?? null;
  if (image?.startsWith("//")) image = "https:" + image;
  if (image && !image.startsWith("https://")) image = null;
  // Naver's og:title can end in an invisible control character (seen: U+001C).
  const title = meta["og:title"]?.replace(/[\u0000-\u001f\u007f-\u009f​-‏﻿]/g, "").trim();
  return { title: title || null, image };
}

// --- Entry point ---

export async function resolvePlace(input: string): Promise<ResolvedPlace> {
  const raw = extractUrl(input.trim());
  if (!raw) throw new ResolveError("링크를 찾을 수 없어요.");
  let start: URL;
  try {
    start = new URL(raw);
  } catch {
    throw new ResolveError("올바른 링크가 아니에요.");
  }
  const provider = providerOf(start);
  if (!provider) throw new ResolveError("네이버 지도, 카카오맵, 구글 지도 링크만 추가할 수 있어요.");
  const shareName = nameFromShareText(input, raw);

  if (provider === "naver") {
    const { value: id } = await followUntil(start, provider, naverPlaceId);
    if (!id) throw new ResolveError("이 네이버 링크에서 장소를 찾지 못했어요. 장소 페이지의 공유 링크를 붙여 넣어 주세요.");
    const embedUrl = `https://m.place.naver.com/place/${id}/home`;
    const og = await openGraph(new URL(embedUrl), provider);
    return {
      provider,
      originalUrl: raw,
      embedUrl,
      openUrl: `https://map.naver.com/p/entry/place/${id}`,
      title: og.title?.replace(/\s*:\s*네이버$/, "") || shareName || `네이버 장소 ${id}`,
      thumbnailUrl: og.image,
    };
  }

  if (provider === "kakao") {
    const { value: id } = await followUntil(start, provider, kakaoPlaceId);
    if (!id) throw new ResolveError("이 카카오맵 링크에서 장소를 찾지 못했어요. 장소 페이지의 공유 링크를 붙여 넣어 주세요.");
    const embedUrl = `https://place.map.kakao.com/${id}`;
    const og = await openGraph(new URL(embedUrl), provider);
    return {
      provider,
      originalUrl: raw,
      embedUrl,
      openUrl: embedUrl,
      title: og.title || shareName || `카카오맵 장소 ${id}`,
      thumbnailUrl: og.image,
    };
  }

  // Google: the full place page can't be framed, so embed a map centred on the place.
  const { url, value: g } = await followUntil(start, provider, googlePlace);
  if (!g) throw new ResolveError("이 구글 지도 링크에서 장소를 찾지 못했어요.");
  const params = new URLSearchParams({ output: "embed", hl: "ko" });
  if (g.cid) params.set("cid", g.cid);
  else {
    params.set("q", g.name ?? "");
    if (g.lat && g.lng) {
      params.set("ll", `${g.lat},${g.lng}`);
      params.set("z", "17");
    }
  }
  return {
    provider,
    originalUrl: raw,
    embedUrl: `https://www.google.com/maps?${params}`,
    openUrl: url.href,
    title: g.name || shareName || "구글 지도 장소",
    thumbnailUrl: null,
  };
}
