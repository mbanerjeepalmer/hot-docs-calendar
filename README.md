# Hot Docs 2026 — Remote Calendar

A SvelteKit app that lists every Hot Docs 2026 screening and lets you add any of
them to your Google Calendar with one click.

- **Source screening list:** [Hot Docs 2026 box office](https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b)
- **Screening schedule PDF:** [HD26_Screening-Schedule.pdf](https://s3.amazonaws.com/assets.hotdocs.ca/doc/HD26_Screening-Schedule.pdf)

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
  start: string;          // ISO datetime WITH timezone offset, e.g. 2026-04-30T19:00:00-04:00
  end?: string;           // ISO datetime; defaults to start + 2h if omitted
  venue: string;          // e.g. "Hot Docs Ted Rogers Cinema"
  address?: string;       // full street address appended to the Google Calendar "location"
  description?: string;   // short synopsis; appended to the Google Calendar "details"
  ticketUrl?: string;     // box office URL; appended to the Google Calendar "details"
};
```

### Placeholder data

The repository currently ships with **placeholder** screenings because the
sandbox this app was scaffolded in could not reach `hotdocs.ca` or
`s3.amazonaws.com`. To populate real data:

1. Open the [PDF schedule](https://s3.amazonaws.com/assets.hotdocs.ca/doc/HD26_Screening-Schedule.pdf)
   or the [box office listings](https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b).
2. Overwrite `src/lib/data/screenings.json` with the full schedule using the
   shape above. All datetimes must be in **Toronto time** with the `-04:00`
   offset during DST.
3. Run `npm run test:e2e` — the existing tests check structure, not specific
   titles, so they continue to pass against real data.

The UI shows a banner while any entry containing `[PLACEHOLDER]` in its title is
still in the data file.

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
