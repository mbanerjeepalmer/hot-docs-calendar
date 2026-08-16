export class FavoritesState {
	username = $state<string | null>(null);
	ready = $state(false);
	favoriteIds = $state<Set<string>>(new Set());
	error = $state<string | null>(null);

	async init() {
		try {
			const [userRes, favRes] = await Promise.all([
				fetch('/api/username'),
				fetch('/api/favorites')
			]);
			if (userRes.ok) {
				const body = (await userRes.json()) as { username: string | null };
				this.username = body.username;
			}
			if (favRes.ok) {
				const body = (await favRes.json()) as { screeningIds: string[] };
				this.favoriteIds = new Set(body.screeningIds);
			}
		} finally {
			this.ready = true;
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
			this.error = res.status === 409 ? 'That username is taken.' : 'Could not save username.';
			return false;
		}
		const body = (await res.json()) as { username: string };
		this.username = body.username;
		return true;
	}

	isFavorite(screeningId: string): boolean {
		return this.favoriteIds.has(screeningId);
	}

	async toggle(screeningId: string) {
		if (!this.username) {
			this.error = 'Choose a username first to save favorites.';
			return;
		}

		const wasFavorite = this.favoriteIds.has(screeningId);
		const optimistic = new Set(this.favoriteIds);
		if (wasFavorite) optimistic.delete(screeningId);
		else optimistic.add(screeningId);
		this.favoriteIds = optimistic;

		const res = await fetch('/api/favorites', {
			method: wasFavorite ? 'DELETE' : 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ screeningId })
		});

		if (!res.ok) {
			const reverted = new Set(this.favoriteIds);
			if (wasFavorite) reverted.add(screeningId);
			else reverted.delete(screeningId);
			this.favoriteIds = reverted;
			this.error = 'Could not update favorite — try again.';
		}
	}
}
