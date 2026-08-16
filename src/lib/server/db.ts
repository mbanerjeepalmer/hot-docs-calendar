import type { RequestEvent } from '@sveltejs/kit';

export function getDB(event: RequestEvent): D1Database {
	const db = event.platform?.env?.DB;
	if (!db) {
		throw new Error(
			'D1 database binding "DB" is not available. Run `npm run dev` (adapter-cloudflare ' +
				'emulates platform.env via wrangler.jsonc) rather than a plain Vite/Node server.'
		);
	}
	return db;
}
