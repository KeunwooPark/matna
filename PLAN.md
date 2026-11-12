# 여기서맛나 (matna) — plan

A small web app that lets a group vote on places to meet. Each place is a link to Naver Map, Kakao Map or Google Maps.

Status (2026-11-12): steps 1–4 done and step 5 done except deployment (steps 3–5 tested in emulation only).

## User flow

1. A host creates an event and adds place links to it.
2. The host shares the event link, which has a hard-to-guess URL, with the participants.
3. Participants open the event page. Places appear as cards in a horizontally scrolling row. Tapping a card shows that place's map page inside the app ("browser in browser"), so the participant can read about the place there. The outer page never scrolls vertically.
4. Each card has a dedicated Select button. A participant can select one or several places.

## Embedding the map pages

The "browser in browser" only works if each link is rewritten to an embeddable URL first. Response headers checked on 2026-11-12 with a mobile Safari user agent:

| Service | Link as shared | Embeddable? | What to do |
|---|---|---|---|
| Naver | `map.naver.com/...`, `naver.me/...` | No (`X-Frame-Options: SAMEORIGIN`) | Extract the place ID and load `m.place.naver.com/place/{id}/home`, which sends no frame-blocking header |
| Kakao | `place.map.kakao.com/{id}`, `kko.to/...` | Yes for `place.map.kakao.com/{id}` (no frame-blocking header) | Resolve short links to the place page |
| Google | `google.com/maps/...`, `maps.app.goo.gl/...` | No (`X-Frame-Options: SAMEORIGIN`) | Use the `google.com/maps/embed` URL, which shows a map and pin but not the full place page with reviews |

Not yet verified:

- Only headers were checked. The pages have not been loaded in a real iframe on a phone; they could still break out of the frame with script or redirect to the app. This is build step 1.
- The Naver URL checked was `m.place.naver.com/restaurant/{id}/home`. The generic `/place/{id}/home` form is assumed to behave the same.
- How to get a place ID out of each kind of short link has not been tried.

### Spike results so far (2026-11-12, Playwright emulation, not real phones)

The spike page is `spike/iframe/index.html`. Run with headless WebKit (iPhone 13 profile) and Chromium (Pixel 7 profile), with and without `sandbox`:

| Case | WebKit (iPhone) | Chromium (Android) |
|---|---|---|
| Naver `m.place.naver.com/place/{id}/home` | Loads, but a Naver security check (CAPTCHA) covers the page | Full place page (photos, reviews tab, hours, phone) |
| Naver `map.naver.com/p/entry/place/{id}` (control) | Blocked by X-Frame-Options | Blocked |
| Kakao `place.map.kakao.com/{id}` | Full place page, with an "open app" banner | Full place page |
| Kakao `m.map.kakao.com/actions/detailMapView?id=` | Map frame loads, map is empty | Same |
| Google `google.com/maps?q=...&output=embed` | Map with pins, no place details | Same |
| Google `google.com/maps/search/...` (control) | Blocked by X-Frame-Options | Blocked |

- No page busted out of the frame. The `sandbox` attribute (without `allow-top-navigation`) didn't break any working page, so the app can use it as a safety net.
- The outer page didn't scroll vertically in either browser.
- The Naver CAPTCHA in WebKit could be bot detection on a headless browser, or Safari blocking third-party cookies in iframes (so the check would repeat for every real iPhone user). Only the real-phone test can tell. If it is the cookie problem, Naver places on iPhone will need the "Open in app" fallback.
- Real-phone result (2026-11-12): on an iPhone in the KakaoTalk in-app browser, the owner reported "no problem", so the headless CAPTCHA was most likely bot detection. iOS Safari, Android Chrome and KakaoTalk on Android were not tested.

The server resolves and rewrites each link once, when the host adds it. Every place also gets an "Open in app" button as a fallback, because these services could add a blocking header at any time.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel: one codebase for the pages and the small API.
- Postgres (Neon or Supabase) with Drizzle.
- No accounts: the unguessable URLs are the access control.

## Data model

- **events**: `id` (random 22-character ID, used in the share URL), `host_token` (a second secret for editing), `title`, `created_at`
- **places**: `id`, `event_id`, `original_url`, `embed_url`, `provider` (`naver` | `kakao` | `google`), `title`, `thumbnail_url`, `position`
- **participants**: `id`, `event_id`, `nickname`. The ID is kept in an httpOnly cookie scoped to `/e/{id}` (see step 4 notes).
- **votes**: `place_id`, `participant_id`, unique on the pair

## Pages

1. **`/` Create event**: the host enters a title and is redirected to the host page.
2. **`/e/{id}/host?t={host_token}` Host page**: paste links, see them turn into cards, reorder or remove them, copy the share link.
3. **`/e/{id}` Participant page**:
   - Layout fixed at `100dvh` with `overflow: hidden`, so the outer page never scrolls vertically.
   - Top area: the iframe viewer for the selected place. Scrolling happens inside it.
   - Bottom strip: a horizontal scroll-snap row of cards, each with thumbnail, name, provider badge, vote count and a Select button.
   - Tapping a card loads it in the viewer. Tapping Select toggles the vote without opening the place.
   - The first visit asks for a nickname.

## Server pieces

- **Link resolver**: follows redirects on short links, detects the provider, extracts the place ID, builds the embed URL, and fetches the title and thumbnail from the page's Open Graph tags. It accepts only the known map domains, so the server can't be used to fetch arbitrary URLs.
- **Vote API**: toggles a vote and returns counts. Clients refresh results by polling every few seconds.

## Build order

1. Iframe spike: a static page with one hardcoded place per provider, tested on iOS Safari, Android Chrome, and the KakaoTalk in-app browser (most participants will open the shared link from KakaoTalk, and its built-in browser is the most likely to break embedding or lose the `localStorage` participant ID). The result may change the embed URLs above.
2. Scaffold, schema, event creation, and the host page with the link resolver. **Done.** Notes:
   - Next.js 16.4 with Cache Components on. Pages that read the database, params or query strings wrap that part in `<Suspense>`, or the build fails. Previously visited routes stay in the DOM (hidden), which matters for tests.
   - `postgres` (postgres.js) is pinned to 3.4.9; v4 changes parameter typing and Drizzle 0.45 was built against v3.
   - Local Postgres runs on port 5433 (5432 was taken on the dev machine).
   - Naver answers 429 and Kakao 403 unless requests carry browser-like headers. During development, Kakao then blocked this machine's IP after repeated requests. So title and thumbnail fetching is best-effort: if the page can't be read, the title comes from the share text around the link, and the host can rename any place. Expect the same blocking from a datacenter IP in production.
   - Not yet tested with real short links (`naver.me`, `kko.to`, `maps.app.goo.gl`). The resolver follows their redirects generically.
   - Host page features: add by pasting a link or share text, rename, reorder (↑/↓), delete. Max 30 places per event.
3. Participant page: layout, card strip, viewer. **Done.** Notes:
   - The page is `position: fixed; inset: 0`, so the outer page can't scroll. Top to bottom: title bar with the selection count, the card strip (moved to the top at the owner's request), a bar with the open place's name and an "Open in app" link (a floating button covered the embedded pages), and the viewer.
   - A 접기/목록 button in the place-name bar folds the card strip away, so the viewer gets the space while reading a place. The bar stays visible, so the strip can be unfolded again.
   - The last 4 opened places keep their iframe (hidden), so switching back doesn't reload the page.
   - The Select button is separate from the card's open button, so selecting doesn't change the viewer.
   - Selections live only in the page's state for now. Step 4 stores them as votes.
4. Voting, nickname and live counts. **Done.** Notes:
   - The participant ID lives in an httpOnly cookie with path `/e/{id}`, not `localStorage` as first planned. The server can then render a returning participant's votes on first load, and page scripts never see the ID. It acts as the participant's secret, so the tally never includes other participants' IDs.
   - The nickname is asked on the first tap of Select, not on page load, so people can browse first. The nickname chip in the header renames.
   - `GET /e/{id}/tally` returns the place order, the other participants' nicknames per place, and the caller's own picks. The page polls it every 4 seconds while visible. If the place order changed (the host added, removed or moved a place), the page refreshes its server-rendered list.
   - Toggles show at once. The optimistic value is dropped only after a tally fetched after the save arrives, so a poll that was already in flight can't flip the button back.
   - Each card shows the vote count and the names, with "나" for your own pick.
   - Limits: 20-character nicknames, 200 participants per event.
   - A browser that loses its cookie (cleared data, or a different browser such as KakaoTalk then Safari) joins as a new participant.
5. Polish: empty and error states, the "Open in app" fallback, a share-link preview, deployment. **Done except deployment.** Notes:
   - Share preview: event pages set `og:title` to "{event} — 어디서 만날까?" and the description to the first three place names. The image is a static `public/og.png` (source: `design/og-image.html`). The page's own `openGraph` replaces the layout's instead of merging, so both list the image.
   - Next.js streams metadata to browsers and puts it in `<head>` only for user agents in `htmlLimitedBots`. That list replaces Next's default, so `next.config.ts` repeats the default and adds `kakaotalk-scrap`, `Daumoa` and `TelegramBot`. Bare "Kakao" or "naver" would also match the in-app browsers real users have. Checked with curl: scraper user agents get the tags in `<head>`, while the KakaoTalk in-app browser gets them streamed. Not yet checked with a real KakaoTalk share, which needs a public URL.
   - Host page: a share button that opens the phone's share sheet (where `navigator.share` exists), a link to the participant view, the participant count, and each place's votes with a "최다" mark on the leader(s). It re-renders from the server every 10 seconds while visible.
   - "Open in app": each place has the link in the bar under the strip. If a place page hasn't loaded after 8 seconds, the viewer also offers it. A page blocked by frame headers can't be detected from the parent, so the link is always shown rather than only on failure.
   - Error states: a root error page with retry, a 404 page, a "모임을 찾을 수 없어요" page with a link to create one, and an empty state for an event with no places yet.
   - Deployment prep: the DB client uses `prepare: false` for pooled connections; the README has deployment steps; `SITE_URL` sets the share image's origin.
   - Deployment: Vercel project `matna` with functions in Singapore (`sin1`) and Neon Postgres in Singapore. The owner set `DATABASE_URL` as a Vercel environment variable. Migrations run in the Vercel build (`vercel-build` → `scripts/migrate.mjs` → `next build`), production builds only.
   - First production deploy (2026-11-12): live at https://matna-rust.vercel.app; the host, participant and voting tests pass against it. From Vercel's servers, Naver place pages return a title and thumbnail. Kakao didn't (the title came from the share text, no thumbnail), the same as from the dev machine. The app's domain is `matna.space` (`SITE_URL` is set to it; `www.matna.space` redirects to it with a 308). Its DNS still pointed to Namecheap parking at first deploy.

## Open decisions

These are defaults proposed in the plan; the owner has not confirmed them.

- **Vote visibility**: show counts and who voted to everyone (implemented in step 4). The alternative is hiding results until the host closes voting.
- **Who can add places**: host only, as in the user flow. Letting participants suggest places is a small later addition.
- **Google links**: the embed is map-only. If the full Google place page matters, the only option is opening it in a new tab.
