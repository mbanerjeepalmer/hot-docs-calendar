# Hot Docs 2026 — Remote Calendar

A SvelteKit app that lists every Hot Docs 2026 screening and lets you add any of
them to your Google Calendar with one click.

- **Source screening list:** [Hot Docs 2026 box office](https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b)
- **Screening schedule PDF:** [HD26_Screening-Schedule.pdf](https://s3.amazonaws.com/assets.hotdocs.ca/doc/HD26_Screening-Schedule.pdf)

## Stack

- SvelteKit (scaffolded with `sv create`), deployed as a Cloudflare Worker via
  `@sveltejs/adapter-cloudflare`
- Tailwind CSS v4 (with `forms` + `typography` plugins)
- Cloudflare D1 (SQLite) for usernames + favorited screenings
- Playwright (e2e + unit-style tests)

## Develop

```sh
npm install
npm run dev
```

## Test

```sh
npm run test:e2e
```

Tests live under `e2e/` and run against a built preview server.

### Running Playwright in a sandboxed environment

If the default Playwright browser download host is unreachable, point Playwright
at a pre-installed browser cache:

```sh
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright test --project=chromium
```

## Screening data

Screenings live in [`src/lib/data/screenings.json`](src/lib/data/screenings.json)
as an array of `Screening` objects:

```ts
type Screening = {
  id: string;             // unique id
  title: string;          // film title
  start: string;          // ISO datetime WITH timezone offset, e.g. 2026-04-30T19:00:00-04:00
  end?: string;           // ISO datetime; defaults to start + 2h if omitted
  venue: string;          // e.g. "Hot Docs Ted Rogers Cinema"
  address?: string;       // full street address appended to the Google Calendar "location"
  description?: string;   // short synopsis; appended to the Google Calendar "details"
  ticketUrl?: string;     // box office URL; appended to the Google Calendar "details"
};
```

### Refreshing the schedule

`src/lib/data/screenings.json` is generated from the official Hot Docs PDF
schedule. To refresh:

```sh
npm install
npm run fetch:sources    # downloads the PDF + captures the box office page
npm run parse:pdf        # pdftotext + parser → src/lib/data/screenings.json
```

`fetch:sources` writes:
- `scripts/data/HD26_Screening-Schedule.pdf` — the raw schedule PDF
- `scripts/data/list.html` — fully-rendered box office listing (post-JS)
- `scripts/data/list.png` — full-page screenshot
- `scripts/data/xhr/*.json` — every JSON payload the listing page fetched
- `scripts/data/xhr-log.json` — index of XHR/fetch responses

`parse:pdf` requires `pdftotext` (poppler-utils) on the path.

## Favorites (Cloudflare D1)

The schedule itself is still static (built into the site), but you can pick a
username and star screenings — those favorites are stored in a Cloudflare D1
database, keyed by a random id cookie tied to the username you chose. There's
no password yet ("phase 1" — see `migrations/0001_init.sql` for the schema);
a real login can replace this later without changing the favorites table.

### Local development

Local dev runs entirely against a local D1 emulator (SQLite on disk under
`.wrangler/`) — no Cloudflare account needed for this part:

```sh
npm run db:migrate:local   # applies migrations/*.sql to the local DB
npm run dev                # vite dev; adapter-cloudflare emulates platform.env.DB
```

`platform.env` (and therefore `DB`) is only populated when running through
the Cloudflare adapter's dev emulation or `wrangler dev` — plain `vite dev`
without `wrangler.jsonc` configured won't have it.

### Deploying for real

1. `npx wrangler login` (needs a browser).
2. `npx wrangler d1 create hot-docs-calendar` and copy the returned
   `database_id` into `wrangler.jsonc` (it currently has a placeholder
   `00000000-…` id).
3. `npm run db:migrate:remote` — applies `migrations/*.sql` to the real D1
   database.
4. `npm run deploy` — builds the SvelteKit app and runs `wrangler deploy`.

### Schema

```
users(id TEXT PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE, created_at)
favorites(user_id, screening_id, created_at, PRIMARY KEY (user_id, screening_id))
```

### API

- `GET /api/username` → `{ username: string | null }`
- `POST /api/username` `{ username }` → claims a username (first call) or
  renames the current user (subsequent calls); 409 if taken.
- `GET /api/favorites` → `{ screeningIds: string[] }`
- `POST /api/favorites` `{ screeningId }` → star a screening (401 without a
  username set).
- `DELETE /api/favorites` `{ screeningId }` → unstar.

## Project structure

```
src/
  lib/
    data/screenings.json     # the schedule — edit this file
    googleCalendar.ts        # builds calendar.google.com/calendar/render URLs
    screenings.ts            # load, sort, group-by-day, format helpers
    favorites.svelte.ts      # client-side favorites/username state
    server/db.ts             # platform.env.DB accessor
    server/user.ts           # cookie + username lookups
    types.ts                 # Screening type
  routes/
    +layout.svelte
    +page.ts                 # loads screenings at build time (prerender)
    +page.svelte             # list UI with search, venue filter, favorites
    api/username/+server.ts  # claim/rename a username
    api/favorites/+server.ts # list/add/remove favorited screenings
migrations/
  0001_init.sql              # D1 schema: users, favorites
e2e/
  home.e2e.ts                # page-level tests
  googleCalendar.e2e.ts      # URL-builder tests
```

## Build

```sh
npm run build
npm run preview
```

The schedule page is still pre-rendered to static HTML, but `/api/*` routes
and the D1-backed favorites feature need a Worker at runtime — the build
output is a Cloudflare Worker with static assets (see `wrangler.jsonc`), not
a plain static site. See [Favorites (Cloudflare D1)](#favorites-cloudflare-d1)
above for local dev and deploy steps.
