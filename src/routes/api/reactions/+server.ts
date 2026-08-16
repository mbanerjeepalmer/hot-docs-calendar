import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db.js';
import { requireUserId } from '$lib/server/user.js';

const REACTION_KINDS = new Set(['mini_star', 'mega_star', 'tickets']);
const MAX_TICKETS = 20;

// Reactions are shared, not private — everyone can see who reacted what to
// which screening, so this list is not scoped to the current user.
export const GET: RequestHandler = async (event) => {
	const db = getDB(event);
	const { results } = await db
		.prepare(
			`SELECT r.screening_id, r.kind, r.ticket_count, u.username
			 FROM reactions r JOIN users u ON u.id = r.user_id
			 ORDER BY r.created_at ASC`
		)
		.all<{ screening_id: string; kind: string; ticket_count: number | null; username: string }>();

	return json({
		reactions: results.map((r) => ({
			screeningId: r.screening_id,
			username: r.username,
			kind: r.kind,
			ticketCount: r.ticket_count
		}))
	});
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as
		| { screeningId?: string; kind?: string; ticketCount?: number }
		| null;
	const screeningId = typeof body?.screeningId === 'string' ? body.screeningId : '';
	const kind = typeof body?.kind === 'string' ? body.kind : '';
	if (!screeningId || !REACTION_KINDS.has(kind)) {
		throw error(400, 'screeningId and a valid kind (mini_star, mega_star, tickets) are required.');
	}

	let ticketCount: number | null = null;
	if (kind === 'tickets') {
		const n = Number(body?.ticketCount);
		if (!Number.isInteger(n) || n < 1 || n > MAX_TICKETS) {
			throw error(400, `ticketCount must be an integer between 1 and ${MAX_TICKETS}.`);
		}
		ticketCount = n;
	}

	const uid = await requireUserId(event);
	const db = getDB(event);
	await db
		.prepare(
			`INSERT INTO reactions (user_id, screening_id, kind, ticket_count) VALUES (?, ?, ?, ?)
			 ON CONFLICT (user_id, screening_id)
			 DO UPDATE SET kind = excluded.kind, ticket_count = excluded.ticket_count`
		)
		.bind(uid, screeningId, kind, ticketCount)
		.run();

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as { screeningId?: string } | null;
	const screeningId = typeof body?.screeningId === 'string' ? body.screeningId : '';
	if (!screeningId) throw error(400, 'screeningId is required.');

	const uid = await requireUserId(event);
	const db = getDB(event);
	await db.prepare('DELETE FROM reactions WHERE user_id = ? AND screening_id = ?').bind(uid, screeningId).run();

	return json({ ok: true });
};
