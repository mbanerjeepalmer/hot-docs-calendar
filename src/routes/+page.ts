import { getScreenings, groupByDay } from '$lib/screenings.js';

export const prerender = true;

export function load() {
	const screenings = getScreenings();
	return {
		screenings,
		days: groupByDay(screenings)
	};
}
