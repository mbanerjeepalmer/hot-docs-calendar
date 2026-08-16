# Sarajevo Film Festival 2026 — Remote Calendar

A SvelteKit app that lists every Sarajevo Film Festival 2026 (32nd edition,
14–21 August 2026) screening and lets you add any of them to your Google
Calendar with one click.

- **Source:** [sff.ba](https://www.sff.ba/en) and its box office API at
  [api3.sff.ba](https://api3.sff.ba), which powers [tickets.sff.ba](https://tickets.sff.ba)

## Stack

- SvelteKit (scaffolded with `sv create`)
- Tailwind CSS v4 (with `forms` + `typography` plugins)
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

## Project structure

```
src/
  lib/
    data/screenings.json   # the schedule — edit this file
    googleCalendar.ts      # builds calendar.google.com/calendar/render URLs
    screenings.ts          # load, sort, group-by-day, format helpers
    types.ts               # Screening type
  routes/
    +layout.svelte
    +page.ts               # loads screenings at build time (prerender)
    +page.svelte           # list UI with search and venue filter
e2e/
  home.e2e.ts              # page-level tests
  googleCalendar.e2e.ts    # URL-builder tests
```

## Build

```sh
npm run build
npm run preview
```

The page is pre-rendered, so the built output is a static site that can be
served from any host.
