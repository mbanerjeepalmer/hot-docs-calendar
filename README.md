# Sarajevo Film Festival 2026 — Calendar

A SvelteKit calendar for the 32nd Sarajevo Film Festival, taking place from
14–21 August 2026. It provides a single subscribable calendar feed and
one-click Google Calendar links for every screening once the official programme
is published.

- **Official festival website:** [sff.ba/en](https://www.sff.ba/en)
- **Programme:** [sff.ba/en/page/programme](https://www.sff.ba/en/page/programme)

## Stack

- SvelteKit
- Tailwind CSS v4
- Playwright

## Develop

```sh
npm install
npm run dev
```

## Test

```sh
npm run check
npm run test:e2e
```

Tests run against a built preview server.

## Screening data

Screenings live in `src/lib/data/screenings.json` as an array of `Screening`
objects. The file is intentionally empty until the festival publishes its 2026
schedule; this avoids presenting a previous festival's programme as current.

```ts
type Screening = {
  id: string;
  title: string;
  start: string;          // ISO datetime with Sarajevo's UTC offset
  end?: string;
  venue: string;
  address?: string;
  description?: string;
  ticketUrl?: string;
};
```

The UI, Google Calendar links, and ICS feed all use the `Europe/Sarajevo` time
zone. Add official screenings to the JSON file and they will automatically be
sorted, grouped by date, displayed, and included in the feed.

## Build

```sh
npm run build
npm run preview
```

The application and calendar feed are prerendered and can be served from any
static host.
