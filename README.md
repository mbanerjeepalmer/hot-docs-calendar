# Sarajevo Film Festival 2026 — Remote Calendar

A SvelteKit app that lists every Sarajevo Film Festival 2026 (32nd edition,
14–21 August 2026) screening and lets you add any of them to your Google
Calendar with one click.

- **Source:** [sff.ba](https://www.sff.ba/en) and its box office API at
  [api3.sff.ba](https://api3.sff.ba), which powers [tickets.sff.ba](https://tickets.sff.ba)

## Stack

- SvelteKit (scaffolded with `sv create`), deployed as a Cloudflare Worker via
  `@sveltejs/adapter-cloudflare`
- Tailwind CSS v4 (with `forms` + `typography` plugins)
- Cloudflare D1 (SQLite) for usernames + shared reactions
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
  start: string;          // ISO datetime WITH timezone offset, e.g. 2026-08-21T19:00:00+02:00
  end?: string;            // ISO datetime; defaults to start + 2h if omitted
  venue: string;           // e.g. "Cineplexx Sarajevo 4"
  address?: string;        // full street address appended to the Google Calendar "location"
  description?: string;    // short synopsis; appended to the Google Calendar "details"
  ticketUrl?: string;      // box office URL; appended to the Google Calendar "details"
  image?: string;          // poster thumbnail URL
  programme?: string;      // comma-joined programme tags, e.g. "Competition Programme -
                            // Documentary Film, Submissions" (the "32nd SFF - " prefix is
                            // already stripped by cleanProgramme() in parse-sff.mjs); the
                            // schedule page splits this on ", " into individual filter tags
};
```

### Refreshing the schedule

`src/lib/data/screenings.json` is generated from the public JSON API that
[tickets.sff.ba](https://tickets.sff.ba) (the festival's React ticketing SPA)
calls under the hood at `api3.sff.ba`. No PDF or browser rendering is needed —
it's a plain, unauthenticated JSON API. To refresh:

```sh
npm run fetch:sources     # downloads screenings.json, films.json, edition.json
npm run parse:schedule    # combine → src/lib/data/screenings.json
```

`fetch:sources` writes to `scripts/data/`:
- `edition.json` — current edition basics (name, festival start/end dates)
- `screenings.json` — every scheduled screening (`GET /screenings/online?RetrieveAll=true`)
- `films.json` — full film catalogue with synopsis/country/runtime
  (`GET /films?RetrieveAll=true&Includes=...`)

`parse:schedule` matches each screening's title against the film catalogue
(shorts blocks and programme collections that don't correspond 1:1 to a single
film — e.g. "BH Film - Documentaries 1" — are kept as-is, just without a
synopsis) and writes `src/lib/data/screenings.json`.

All screening times are Sarajevo local time (CEST, UTC+2); the whole festival
window falls inside the EU's summer-time period, so there's no DST transition
to handle.

## Reactions (Cloudflare D1)

The schedule itself is still static (built into the site), but you can pick a
username and react to any screening with one of three, mutually-exclusive
reactions — mini star, mega star, or a number of tickets wanted. Reactions
are shared, not private: every screening shows *everyone's* reaction inline
("alice ☆ · bob 🎟×2"), and the [`/list`](src/routes/list) page rounds up
every screening anyone has reacted to, across all users, in one place.

There's no password yet ("phase 1" — see `migrations/0001_init.sql` for the
user schema); a real login can replace this later without changing the
reactions table. Since there's no password, typing an *existing* username
just switches your browser's cookie to that identity ("logs you in" as
them) — that's how you pick your reactions back up on a different device.

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
reactions(user_id, screening_id, kind CHECK IN ('mini_star','mega_star','tickets'),
          ticket_count, created_at, PRIMARY KEY (user_id, screening_id))
```

One row per user per screening — setting a new reaction replaces the old one.

### API

- `GET /api/username` → `{ username: string | null }`
- `POST /api/username` `{ username }` → claims a new username, renames the
  current user, or — if that username already exists — logs into it (sets
  the cookie to that user's id, no password check).
- `GET /api/reactions` → `{ reactions: { screeningId, username, kind, ticketCount }[] }`
  — everyone's reactions, not scoped to the caller.
- `POST /api/reactions` `{ screeningId, kind, ticketCount? }` → set/replace
  the current user's reaction (401 without a username set; `ticketCount`
  required, 1–20, when `kind` is `"tickets"`).
- `DELETE /api/reactions` `{ screeningId }` → clear the current user's
  reaction.

## Project structure

```
src/
  lib/
    data/screenings.json     # the schedule — edit this file
    googleCalendar.ts        # builds calendar.google.com/calendar/render URLs
    screenings.ts            # load, sort, group-by-day, format helpers
    reactions.svelte.ts      # client-side reactions/username state
    server/db.ts             # platform.env.DB accessor
    server/user.ts           # cookie + username lookups
    types.ts                 # Screening type
  routes/
    +layout.svelte
    +page.ts                 # loads screenings at build time (prerender)
    +page.svelte             # list UI with search, venue filter, reactions
    list/+page.ts             # loads screenings for the aggregate view
    list/+page.svelte         # every screening anyone has reacted to
    api/username/+server.ts  # claim/rename/log into a username
    api/reactions/+server.ts # list/set/clear reactions (shared, all users)
migrations/
  0001_init.sql              # D1 schema: users
  0002_reactions.sql         # D1 schema: reactions (drops old favorites table)
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
and the D1-backed reactions feature need a Worker at runtime — the build
output is a Cloudflare Worker with static assets (see `wrangler.jsonc`), not
a plain static site. See [Reactions (Cloudflare D1)](#reactions-cloudflare-d1)
above for local dev and deploy steps.
