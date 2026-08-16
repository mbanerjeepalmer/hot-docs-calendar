import type { Screening } from './types.js';

const CRLF = '\r\n';
const DEFAULT_DURATION_MINUTES = 120;
const PRODID = '-//hot-docs-calendar//Sarajevo Film Festival 2026//EN';

function pad(n: number, w = 2): string {
	return String(n).padStart(w, '0');
}

function utcStamp(iso: string): string {
	const d = new Date(iso);
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

// RFC 5545 §3.3.11 escape rules for TEXT values.
function escapeText(s: string): string {
	return s
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r\n|\r|\n/g, '\\n');
}

// RFC 5545 §3.1 line folding: max 75 octets per content line. Continuations
// start with CRLF + a single LWSP character (space). We measure UTF-8 octets,
// not codepoints, and split on a character boundary.
function fold(line: string): string {
	const enc = new TextEncoder();
	if (enc.encode(line).length <= 75) return line;
	const out: string[] = [];
	let cur = '';
	let bytes = 0;
	for (const ch of line) {
		const w = enc.encode(ch).length;
		if (bytes + w > 75) {
			out.push(cur);
			cur = ' ' + ch;
			bytes = enc.encode(cur).length;
		} else {
			cur += ch;
			bytes += w;
		}
	}
	if (cur) out.push(cur);
	return out.join(CRLF);
}

function event(s: Screening, dtstamp: string): string[] {
	const end =
		s.end ??
		new Date(
			new Date(s.start).getTime() + DEFAULT_DURATION_MINUTES * 60_000
		).toISOString();
	const location = [s.venue, s.address].filter(Boolean).join(', ');
	const description = [s.description, s.ticketUrl].filter(Boolean).join('\n\n');
	const lines = [
		'BEGIN:VEVENT',
		`UID:${s.id}@hot-docs-calendar`,
		`DTSTAMP:${dtstamp}`,
		`DTSTART:${utcStamp(s.start)}`,
		`DTEND:${utcStamp(end)}`,
		fold(`SUMMARY:${escapeText(s.title)}`),
		fold(`LOCATION:${escapeText(location)}`)
	];
	if (description) lines.push(fold(`DESCRIPTION:${escapeText(description)}`));
	if (s.ticketUrl) lines.push(fold(`URL:${s.ticketUrl}`));
	lines.push('END:VEVENT');
	return lines;
}

export function buildIcs(
	screenings: Screening[],
	options: { name?: string; now?: Date } = {}
): string {
	const dtstamp = utcStamp((options.now ?? new Date()).toISOString());
	const name = options.name ?? 'Sarajevo Film Festival 2026';
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		`PRODID:${PRODID}`,
		'METHOD:PUBLISH',
		'CALSCALE:GREGORIAN',
		fold(`NAME:${escapeText(name)}`),
		fold(`X-WR-CALNAME:${escapeText(name)}`),
		'X-WR-TIMEZONE:Europe/Sarajevo'
	];
	for (const s of screenings) lines.push(...event(s, dtstamp));
	lines.push('END:VCALENDAR');
	return lines.join(CRLF) + CRLF;
}
