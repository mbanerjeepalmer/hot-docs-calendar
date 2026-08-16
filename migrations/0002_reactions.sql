-- Replaces the boolean favorite star (and the localStorage-only "Save to"
-- tickets/shortlist/longlist lists, which never left the browser) with one
-- shared reaction per user per screening: a mini star, a mega star, or a
-- number of tickets wanted. Visible to everyone, not just the reactor.

CREATE TABLE reactions (
	user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	screening_id TEXT NOT NULL,
	kind TEXT NOT NULL CHECK (kind IN ('mini_star', 'mega_star', 'tickets')),
	ticket_count INTEGER,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (user_id, screening_id)
);

CREATE INDEX idx_reactions_screening ON reactions (screening_id);

-- Carry forward existing stars as mega_star reactions (★ was the filled-in
-- icon for a favorite, same icon mega_star uses) before dropping the old
-- table — don't lose what people already picked.
INSERT INTO reactions (user_id, screening_id, kind, ticket_count, created_at)
SELECT user_id, screening_id, 'mega_star', NULL, created_at FROM favorites;

DROP TABLE favorites;
