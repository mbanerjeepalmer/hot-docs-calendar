import data from './data/screenings.json';
import type { Screening } from './types.js';

export function getScreenings(): Screening[] {
	return (data as Screening[]).slice().sort((a, b) => a.start.localeCompare(b.start));
}

export function groupByDay(screenings: Screening[]): { day: string; items: Screening[] }[] {
	const byDay = new Map<string, Screening[]>();
	for (const s of screenings) {
		const day = s.start.slice(0, 10);
		if (!byDay.has(day)) byDay.set(day, []);
		byDay.get(day)!.push(s);
	}
	return [...byDay.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([day, items]) => ({ day, items }));
}

export function formatDayHeading(day: string): string {
	const d = new Date(`${day}T12:00:00+02:00`);
	return d.toLocaleDateString('en-GB', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		timeZone: 'Europe/Sarajevo'
	});
}

export function formatTime(iso: string): string {
	// 24h clock, as used throughout the SFF programme and box office.
	return new Date(iso).toLocaleTimeString('en-GB', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'Europe/Sarajevo'
	});
}

export function synopsis(description?: string): string {
	if (!description) return '';
	const lines = description.split('\n');
	// api3.sff.ba format: "country · NN min · programme", synopsis…
	return lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
}

export function runtime(description?: string): string {
	if (!description) return '';
	const m = description.match(/(\d+)\s*min/);
	return m ? `${m[1]} min` : '';
}

// Screenings of the same film share a filmId (when matched to a film
// record); screenings that didn't match one (shorts blocks, programme
// collections) fall back to grouping by title.
export function filmKey(s: Screening): string {
	return s.filmId != null ? `id:${s.filmId}` : `title:${s.title}`;
}

export function groupScreeningsByFilm(screenings: Screening[]): Map<string, Screening[]> {
	const map = new Map<string, Screening[]>();
	for (const s of screenings) {
		const key = filmKey(s);
		const list = map.get(key);
		if (list) list.push(s);
		else map.set(key, [s]);
	}
	return map;
}
