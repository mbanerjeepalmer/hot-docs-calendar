import type { Screening } from './types.js';

const DEFAULT_DURATION_MINUTES = 120;
const TZ = 'Europe/Sarajevo';

function toGCalStamp(iso: string): string {
	const d = new Date(iso);
	const pad = (n: number, w = 2) => String(n).padStart(w, '0');
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

export function formatGCalDates(startIso: string, endIso: string): string {
	return `${toGCalStamp(startIso)}/${toGCalStamp(endIso)}`;
}

export function buildGoogleCalendarUrl(screening: Screening): string {
	const endIso =
		screening.end ??
		new Date(
			new Date(screening.start).getTime() + DEFAULT_DURATION_MINUTES * 60_000
		).toISOString();

	const details = [screening.description, screening.ticketUrl].filter(Boolean).join('\n\n');
	const location = [screening.venue, screening.address].filter(Boolean).join(', ');

	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: screening.title,
		dates: formatGCalDates(screening.start, endIso),
		ctz: TZ,
		location,
		details
	});
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
