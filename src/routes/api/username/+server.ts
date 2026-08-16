import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDB } from '$lib/server/db.js';
import { getCurrentUserId, isValidUsername, UID_COOKIE, UID_COOKIE_MAX_AGE } from '$lib/server/user.js';

export const GET: RequestHandler = async (event) => {
	const uid = await getCurrentUserId(event);
	if (!uid) return json({ username: null });

	const db = getDB(event);
	const row = await db
		.prepare('SELECT username FROM users WHERE id = ?')
		.bind(uid)
		.first<{ username: string }>();
	return json({ username: row?.username ?? null });
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as { username?: string } | null;
	const username = typeof body?.username === 'string' ? body.username.trim() : '';
	if (!isValidUsername(username)) {
		throw error(400, 'Username must be 1-32 characters: letters, numbers, spaces, - or _.');
	}

	const db = getDB(event);

	// No passwords (by design, see README) — typing an existing username just
	// switches this browser's cookie to that identity, so people can pick their
	// favorites back up on a new device by typing the same name.
	const existing = await db
		.prepare('SELECT id, username FROM users WHERE username = ? COLLATE NOCASE')
		.bind(username)
		.first<{ id: string; username: string }>();

	if (existing) {
		event.cookies.set(UID_COOKIE, existing.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: UID_COOKIE_MAX_AGE
		});
		return json({ username: existing.username });
	}

	const currentUid = await getCurrentUserId(event);
	if (currentUid) {
		await db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(username, currentUid).run();
		return json({ username });
	}

	const id = crypto.randomUUID();
	await db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').bind(id, username).run();

	event.cookies.set(UID_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: UID_COOKIE_MAX_AGE
	});

	return json({ username });
};
