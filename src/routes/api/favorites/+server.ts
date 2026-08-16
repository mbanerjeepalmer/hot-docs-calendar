import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db.js';
import { getCurrentUserId, requireUserId } from '$lib/server/user.js';

export const GET: RequestHandler = async (event) => {
	const uid = await getCurrentUserId(event);
	if (!uid) return json({ screeningIds: [] });

	const db = getDB(event);
	const { results } = await db
		.prepare('SELECT screening_id FROM favorites WHERE user_id = ?')
		.bind(uid)
		.all<{ screening_id: string }>();
	return json({ screeningIds: results.map((r) => r.screening_id) });
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as { screeningId?: string } | null;
	const screeningId = typeof body?.screeningId === 'string' ? body.screeningId : '';
	if (!screeningId) throw error(400, 'screeningId is required.');

	const uid = await requireUserId(event);
	const db = getDB(event);
	await db
		.prepare('INSERT INTO favorites (user_id, screening_id) VALUES (?, ?) ON CONFLICT DO NOTHING')
		.bind(uid, screeningId)
		.run();
	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as { screeningId?: string } | null;
	const screeningId = typeof body?.screeningId === 'string' ? body.screeningId : '';
	if (!screeningId) throw error(400, 'screeningId is required.');

	const uid = await requireUserId(event);
	const db = getDB(event);
	await db
		.prepare('DELETE FROM favorites WHERE user_id = ? AND screening_id = ?')
		.bind(uid, screeningId)
		.run();
	return json({ ok: true });
};
