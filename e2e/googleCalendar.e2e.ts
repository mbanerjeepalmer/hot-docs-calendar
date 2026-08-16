import { expect, test } from '@playwright/test';
import { buildGoogleCalendarUrl, formatGCalDates } from '../src/lib/googleCalendar.js';
import type { Screening } from '../src/lib/types.js';

test('formatGCalDates produces compact UTC range', () => {
	const range = formatGCalDates(
		'2026-04-30T19:00:00-04:00',
		'2026-04-30T20:30:00-04:00'
	);
	expect(range).toBe('20260430T230000Z/20260501T003000Z');
});

test('buildGoogleCalendarUrl composes a TEMPLATE render URL with required params', () => {
	const screening: Screening = {
		id: 'abc',
		title: 'The Test Film',
		start: '2026-05-01T18:30:00-04:00',
		end: '2026-05-01T20:00:00-04:00',
		venue: 'Hot Docs Ted Rogers Cinema',
		address: '506 Bloor St W, Toronto, ON',
		description: 'A documentary about testing.',
		ticketUrl: 'https://example.com/tickets/abc'
	};
	const url = new URL(buildGoogleCalendarUrl(screening));
	expect(url.host).toBe('calendar.google.com');
	expect(url.pathname).toBe('/calendar/render');
	expect(url.searchParams.get('action')).toBe('TEMPLATE');
	expect(url.searchParams.get('text')).toBe('The Test Film');
	expect(url.searchParams.get('dates')).toBe('20260501T223000Z/20260502T000000Z');
	expect(url.searchParams.get('location')).toContain('Hot Docs Ted Rogers Cinema');
	expect(url.searchParams.get('location')).toContain('506 Bloor St W, Toronto, ON');
	expect(url.searchParams.get('ctz')).toBe('Europe/Sarajevo');
	expect(url.searchParams.get('details')).toContain('documentary about testing');
	expect(url.searchParams.get('details')).toContain('https://example.com/tickets/abc');
});

test('buildGoogleCalendarUrl defaults duration when end is missing', () => {
	const screening: Screening = {
		id: 'no-end',
		title: 'Untimed',
		start: '2026-05-02T14:00:00-04:00',
		venue: 'Scotiabank Theatre'
	};
	const url = new URL(buildGoogleCalendarUrl(screening));
	expect(url.searchParams.get('dates')).toBe('20260502T180000Z/20260502T200000Z');
});

// Spec-compliance checks for Google Calendar's documented /render?action=TEMPLATE
// API. Each parameter is a candidate for footguns — encoded specials, +/- offsets,
// reserved characters in title/location, naive Date math, etc. These tests pin
// down the format Google expects so a regression would fire here before a user
// ever clicks an "Add to Google Calendar" button.

test('dates parameter is exactly 8+1+6+Z/8+1+6+Z and reflects UTC (no local offset leak)', () => {
	const screening: Screening = {
		id: 'tz',
		title: 'TZ check',
		start: '2026-04-23T19:00:00-04:00', // 19:00 EDT = 23:00 UTC
		end: '2026-04-23T20:30:00-04:00',
		venue: 'Hot Docs Ted Rogers Cinema'
	};
	const url = new URL(buildGoogleCalendarUrl(screening));
	const dates = url.searchParams.get('dates');
	expect(dates).toBe('20260423T230000Z/20260424T003000Z');
	// Format is exactly the Google-documented compact UTC pair.
	expect(dates).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
});

test('after-midnight roll-over from EDT to UTC crosses to the next day', () => {
	// 11:00 PM EDT screening is 03:00 UTC the NEXT day. End of a 90-min show is
	// 04:30 UTC the next day. Easy to get wrong with naive Date.toISOString.
	const screening: Screening = {
		id: 'late',
		title: 'Late Night',
		start: '2026-04-25T23:00:00-04:00',
		end: '2026-04-26T00:30:00-04:00',
		venue: 'TIFF Lightbox – Cinema 1'
	};
	const url = new URL(buildGoogleCalendarUrl(screening));
	expect(url.searchParams.get('dates')).toBe('20260426T030000Z/20260426T043000Z');
});

test('reserved characters in title and location are URL-encoded, not raw', () => {
	const screening: Screening = {
		id: 'special',
		title: 'IT’S DOROTHY! & MORE: A “TEST” / FILM',
		start: '2026-04-25T16:45:00-04:00',
		end: '2026-04-25T18:22:00-04:00',
		venue: 'TIFF Lightbox – Cinema 1',
		address: '350 King St W, Toronto, ON'
	};
	const raw = buildGoogleCalendarUrl(screening);
	// The raw URL must contain only URL-safe characters in the query string.
	const queryRaw = raw.split('?')[1] ?? '';
	expect(queryRaw).not.toMatch(/[ "<>{}|\\^`]/);
	// And decoding must round-trip back to the original strings.
	const url = new URL(raw);
	expect(url.searchParams.get('text')).toBe('IT’S DOROTHY! & MORE: A “TEST” / FILM');
	expect(url.searchParams.get('location')).toBe('TIFF Lightbox – Cinema 1, 350 King St W, Toronto, ON');
});

test('multi-line description is preserved across LF newlines', () => {
	const screening: Screening = {
		id: 'desc',
		title: 'Multiline',
		start: '2026-04-26T13:00:00-04:00',
		venue: 'Hot Docs Ted Rogers Cinema',
		description: 'First line.\nSecond line.\n\nThird paragraph.',
		ticketUrl: 'https://example.com/t'
	};
	const url = new URL(buildGoogleCalendarUrl(screening));
	const details = url.searchParams.get('details');
	expect(details).toContain('First line.');
	expect(details).toContain('Second line.');
	expect(details).toContain('Third paragraph.');
	expect(details).toContain('https://example.com/t');
});

test('every real screening generates a syntactically-valid Google Calendar URL', async () => {
	// Apply the spec to the entire shipped dataset, not just hand-written cases.
	const { default: screenings } = await import('../src/lib/data/screenings.json', {
		with: { type: 'json' }
	});
	expect(Array.isArray(screenings)).toBe(true);
	expect(screenings.length).toBeGreaterThan(100);
	for (const s of screenings as Screening[]) {
		const u = new URL(buildGoogleCalendarUrl(s));
		expect(u.host).toBe('calendar.google.com');
		expect(u.pathname).toBe('/calendar/render');
		expect(u.searchParams.get('action')).toBe('TEMPLATE');
		expect(u.searchParams.get('text')).toBe(s.title);
		expect(u.searchParams.get('dates')).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
		expect(u.searchParams.get('ctz')).toBe('Europe/Sarajevo');
		expect(u.searchParams.get('location')!.length).toBeGreaterThan(0);
		// Sanity: end must be strictly after start.
		const [a, b] = u.searchParams.get('dates')!.split('/');
		expect(b > a).toBe(true);
	}
});
