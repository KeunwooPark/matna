# 여기서맛나 (matna)

A small web app for a group to vote on where to meet. Live at **https://matna.space**.

1. A host creates an event and pastes in links to places from Naver Map, Kakao Map or Google Maps.
2. The host shares the event link (for example in a KakaoTalk group chat).
3. Participants open the link and see the places as a row of cards. Tapping a card shows that place's map page inside the app, so people can read reviews and hours without leaving it.
4. Each participant picks a nickname and selects one or more places. Everyone sees the votes update live.

There are no accounts. Each event has an unguessable URL, and the host page has a second secret token, so the links themselves are the access control.

## How it works

**Showing map pages in an iframe.** Most map sites refuse to be framed, so the server rewrites each link when it's added:

| Service | Links accepted | Shown in the app as |
|---|---|---|
| Naver | `map.naver.com/...`, `naver.me/...` | `m.place.naver.com/place/{id}/home` (the full place page) |
| Kakao | `place.map.kakao.com/{id}`, `kko.to/...` | `place.map.kakao.com/{id}` (the full place page) |
| Google | `google.com/maps/...`, `maps.app.goo.gl/...` | `google.com/maps?...&output=embed` (map and pin only) |

The resolver (`src/lib/resolve.ts`) follows short-link redirects, extracts the place ID, and reads the title and thumbnail from Open Graph tags. It only fetches the known map domains. Naver and Kakao often block requests from servers, so title fetching is best-effort: if it fails, the title comes from the share text around the link and can be renamed. Every place also has an "Open in app" link, in case a service starts blocking frames.

**Participants and votes.** A participant's ID is kept in an httpOnly cookie scoped to the event path, so other participants' IDs never reach the browser, only nicknames. The participant page polls `GET /e/{id}/tally` every few seconds for vote counts and place changes.

**Share previews.** KakaoTalk and other link scrapers need Open Graph tags in the initial `<head>`, but Next.js streams metadata to most user agents. `next.config.ts` adds the KakaoTalk, Daum and Telegram scrapers to `htmlLimitedBots` so they get the tags.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4
- Postgres with [Drizzle ORM](https://orm.drizzle.team) and [postgres.js](https://github.com/porsager/postgres)
- Hosted on Vercel with a Neon database

## Project layout

```
src/app/            pages and server actions
  page.tsx          create an event
  e/[id]/page.tsx   participant page
  e/[id]/host/      host page
  e/[id]/tally/     vote counts endpoint (polled)
src/lib/            link resolver, places, votes, events
src/db/schema.ts    database schema
drizzle/            generated SQL migrations
scripts/migrate.mjs migration runner used at deploy time
design/             icon and share-image sources
spike/iframe/       early test page for checking which map pages can be framed
```

## Development

Requires Node 24 and Docker.

```bash
npm install
cp .env.example .env.local   # local database URL
npm run db:up                # Postgres on localhost:5433
npm run db:migrate
npm run dev
```

After changing `src/db/schema.ts`, run `npm run db:generate` and then `npm run db:migrate`, and commit the new file in `drizzle/`.

## Deploying your own

Any Node host with Postgres works. Set these environment variables:

- `DATABASE_URL`: the Postgres connection string. Pooled connections (Neon, Supabase) are fine.
- `SITE_URL`: the public origin, such as `https://example.com`. Used for share-image URLs, the canonical URL, the sitemap and `robots.txt`. It's needed at build time.

On Vercel, the `vercel-build` script applies pending migrations before building production deployments. Elsewhere, run `MIGRATE=1 node scripts/migrate.mjs` before `npm run build`.

## License

[MIT](LICENSE)
