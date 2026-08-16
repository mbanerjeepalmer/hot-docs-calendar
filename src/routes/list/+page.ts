import { getScreenings } from '$lib/screenings.js';

export const prerender = true;

export function load() {
	return { screenings: getScreenings() };
}
