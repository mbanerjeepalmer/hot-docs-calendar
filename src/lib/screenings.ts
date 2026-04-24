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
	const d = new Date(`${day}T12:00:00-04:00`);
	return d.toLocaleDateString('en-CA', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		timeZone: 'America/Toronto'
	});
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('en-CA', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'America/Toronto'
	});
}
