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
	expect(url.searchParams.get('ctz')).toBe('America/Toronto');
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
