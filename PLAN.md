# matna — plan

A small web app that lets a group vote on places to meet. Each place is a link to Naver Map, Kakao Map or Google Maps.

Status (2026-11-12): steps 1–3 done (step 3 tested in emulation only). Selections are not saved yet; that is step 4.

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
- **participants**: `id`, `event_id`, `nickname`. The ID is kept in the browser's `localStorage` so votes survive a reload.
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
4. Voting, nickname and live counts.
5. Polish: empty and error states, the "Open in app" fallback, a share-link preview, deployment.

## Open decisions

These are defaults proposed in the plan; the owner has not confirmed them.

- **Vote visibility**: show counts and who voted to everyone. The alternative is hiding results until the host closes voting.
- **Who can add places**: host only, as in the user flow. Letting participants suggest places is a small later addition.
- **Google links**: the embed is map-only. If the full Google place page matters, the only option is opening it in a new tab.
