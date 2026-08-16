import { expect, test } from '@playwright/test';
import { buildIcs } from '../src/lib/ics.js';
import type { Screening } from '../src/lib/types.js';

const sample: Screening[] = [
	{
		id: 'film-a-1900',
		title: 'Film A',
		start: '2026-04-30T19:00:00-04:00',
		end: '2026-04-30T20:30:00-04:00',
		venue: 'Hot Docs Ted Rogers Cinema',
		address: '506 Bloor St W, Toronto, ON',
		description: 'Line one.\nLine two; with semicolon, comma and \\backslash.',
		ticketUrl: 'https://example.com/a'
	},
	{
		id: 'film-b-2300',
		title: 'Film B, the Sequel; & More',
		start: '2026-04-30T23:00:00-04:00',
		end: '2026-05-01T00:30:00-04:00',
		venue: 'TIFF Lightbox – Cinema 1'
	}
];

test('buildIcs wraps events in a VCALENDAR envelope with required properties', () => {
	const ics = buildIcs(sample);
	expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
	expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
	expect(ics).toContain('VERSION:2.0');
	expect(ics).toContain('PRODID:');
	expect(ics).toContain('METHOD:PUBLISH');
	expect(ics).toContain('CALSCALE:GREGORIAN');
	expect(ics).toContain('X-WR-CALNAME:');
	expect(ics).toContain('X-WR-TIMEZONE:Europe/Sarajevo');
});

test('buildIcs emits one VEVENT per screening with UTC DTSTART/DTEND', () => {
	const ics = buildIcs(sample);
	const events = ics.split('BEGIN:VEVENT').slice(1);
	expect(events).toHaveLength(2);
	for (const e of events) {
		expect(e).toContain('END:VEVENT');
		expect(e).toContain('UID:');
		expect(e).toContain('DTSTAMP:');
		expect(e).toMatch(/DTSTART:\d{8}T\d{6}Z/);
		expect(e).toMatch(/DTEND:\d{8}T\d{6}Z/);
		expect(e).toContain('SUMMARY:');
		expect(e).toContain('LOCATION:');
	}
	// UTC math is correct: 19:00 EDT = 23:00 UTC
	expect(ics).toContain('DTSTART:20260430T230000Z');
	expect(ics).toContain('DTEND:20260501T003000Z');
	// After-midnight EDT → UTC roll-over
	expect(ics).toContain('DTSTART:20260501T030000Z');
	expect(ics).toContain('DTEND:20260501T043000Z');
});

test('buildIcs escapes RFC-5545 special chars in text fields', () => {
	const ics = buildIcs(sample);
	// Title "Film B, the Sequel; & More" → commas + semicolons must be escaped
	expect(ics).toContain('SUMMARY:Film B\\, the Sequel\\; & More');
	// Description: newline → \n, semicolon → \;, comma → \, , backslash → \\
	expect(ics).toContain('Line one.\\nLine two\\; with semicolon\\, comma and \\\\backslash.');
});

test('buildIcs folds long lines at 75 octets with CRLF + space continuation', () => {
	const long: Screening = {
		id: 'long',
		title: 'A'.repeat(300),
		start: '2026-04-30T19:00:00-04:00',
		end: '2026-04-30T20:30:00-04:00',
		venue: 'Venue'
	};
	const ics = buildIcs([long]);
	for (const line of ics.split('\r\n')) {
		// Bytes per RFC 5545: 75 octets max per content line (folded continuations
		// are prefixed with a single space).
		expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
	}
	// A folded line continues with CRLF + single space.
	expect(ics).toMatch(/\r\n A/);
});

test('UIDs are unique across the shipped dataset', async () => {
	const { default: screenings } = await import('../src/lib/data/screenings.json', {
		with: { type: 'json' }
	});
	const ics = buildIcs(screenings as Screening[]);
	const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
	expect(uids.length).toBe((screenings as Screening[]).length);
	expect(new Set(uids).size).toBe(uids.length);
});
