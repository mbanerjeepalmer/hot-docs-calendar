import { error } from '@sveltejs/kit';
import { getScreenings } from '$lib/screenings.js';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	const screenings = getScreenings();
	const filmIds = new Set(screenings.filter((s) => s.filmId != null).map((s) => String(s.filmId)));
	return [...filmIds].map((filmId) => ({ filmId }));
};

export const load: PageLoad = ({ params }) => {
	const screenings = getScreenings().filter((s) => String(s.filmId) === params.filmId);
	if (screenings.length === 0) {
		error(404, 'Film not found');
	}
	// All screenings of a film share the same title/year/country/description/
	// image/programme (they're all derived from the same film record).
	return { film: screenings[0], screenings };
};
