import { error, type RequestEvent } from '@sveltejs/kit';
import { getDB } from './db.js';

export const UID_COOKIE = 'hd_uid';
export const UID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isValidUsername(name: string): boolean {
	return /^[a-zA-Z0-9 _-]{1,32}$/.test(name);
}

/** Returns the current user's id, or null if no username has been set (or the cookie is stale). */
export async function getCurrentUserId(event: RequestEvent): Promise<string | null> {
	const uid = event.cookies.get(UID_COOKIE);
	if (!uid) return null;
	const db = getDB(event);
	const row = await db.prepare('SELECT id FROM users WHERE id = ?').bind(uid).first();
	return row ? uid : null;
}

/** Like getCurrentUserId, but throws a 401 if no username has been set yet. */
export async function requireUserId(event: RequestEvent): Promise<string> {
	const uid = await getCurrentUserId(event);
	if (!uid) throw error(401, 'Choose a username first.');
	return uid;
}
