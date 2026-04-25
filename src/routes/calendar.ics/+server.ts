import { buildIcs } from '$lib/ics.js';
import { getScreenings } from '$lib/screenings.js';

export const prerender = true;

export function GET() {
	const ics = buildIcs(getScreenings());
	return new Response(ics, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': 'inline; filename="hot-docs-2026.ics"',
			'cache-control': 'public, max-age=3600'
		}
	});
}
