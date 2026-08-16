export type ReactionKind = 'mini_star' | 'mega_star' | 'tickets';

export type Reaction = {
	username: string;
	kind: ReactionKind;
	ticketCount: number | null;
};

export const REACTION_LABELS: Record<ReactionKind, string> = {
	mini_star: '☆ mini star',
	mega_star: '★ mega star',
	tickets: '🎟 tickets'
};

type ReactionRow = Reaction & { screeningId: string };

function groupByScreening(rows: ReactionRow[]): Map<string, Reaction[]> {
	const map = new Map<string, Reaction[]>();
	for (const { screeningId, ...reaction } of rows) {
		const list = map.get(screeningId);
		if (list) list.push(reaction);
		else map.set(screeningId, [reaction]);
	}
	return map;
}

export class ReactionsState {
	username = $state<string | null>(null);
	ready = $state(false);
	error = $state<string | null>(null);
	reactionsByScreening = $state<Map<string, Reaction[]>>(new Map());

	async init() {
		try {
			const [userRes, reactionsRes] = await Promise.all([fetch('/api/username'), fetch('/api/reactions')]);
			if (userRes.ok) {
				const body = (await userRes.json()) as { username: string | null };
				this.username = body.username;
			}
			if (reactionsRes.ok) {
				const body = (await reactionsRes.json()) as { reactions: ReactionRow[] };
				this.reactionsByScreening = groupByScreening(body.reactions);
			}
		} finally {
			this.ready = true;
		}
	}

	async refresh() {
		const res = await fetch('/api/reactions');
		if (res.ok) {
			const body = (await res.json()) as { reactions: ReactionRow[] };
			this.reactionsByScreening = groupByScreening(body.reactions);
		}
	}

	async setUsername(name: string): Promise<boolean> {
		this.error = null;
		const res = await fetch('/api/username', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ username: name })
		});
		if (!res.ok) {
			this.error = 'Could not save username.';
			return false;
		}
		const body = (await res.json()) as { username: string };
		this.username = body.username;

		// Typing an existing username switches identity to that account, so
		// re-fetch reactions — "mine" now belongs to whoever we just became.
		await this.refresh();
		return true;
	}

	reactionsFor(screeningId: string): Reaction[] {
		return this.reactionsByScreening.get(screeningId) ?? [];
	}

	myReaction(screeningId: string): Reaction | null {
		if (!this.username) return null;
		return this.reactionsFor(screeningId).find((r) => r.username === this.username) ?? null;
	}

	async set(screeningId: string, kind: ReactionKind, ticketCount?: number) {
		if (!this.username) {
			this.error = 'Choose a username first to react.';
			return;
		}
		this.error = null;

		const username = this.username;
		const previous = this.reactionsByScreening;
		const next = new Map(previous);
		const list = (next.get(screeningId) ?? []).filter((r) => r.username !== username);
		list.push({ username, kind, ticketCount: kind === 'tickets' ? (ticketCount ?? 1) : null });
		next.set(screeningId, list);
		this.reactionsByScreening = next;

		const res = await fetch('/api/reactions', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ screeningId, kind, ticketCount })
		});

		if (!res.ok) {
			this.reactionsByScreening = previous;
			this.error = 'Could not save your reaction — try again.';
		}
	}

	async clear(screeningId: string) {
		if (!this.username) return;
		this.error = null;

		const username = this.username;
		const previous = this.reactionsByScreening;
		const next = new Map(previous);
		const list = (next.get(screeningId) ?? []).filter((r) => r.username !== username);
		if (list.length) next.set(screeningId, list);
		else next.delete(screeningId);
		this.reactionsByScreening = next;

		const res = await fetch('/api/reactions', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ screeningId })
		});

		if (!res.ok) {
			this.reactionsByScreening = previous;
			this.error = 'Could not clear your reaction — try again.';
		}
	}
}
