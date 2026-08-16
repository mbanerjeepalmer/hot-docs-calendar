-- Self-chosen usernames (no password, phase 2 may add real auth) and
-- per-user favorited screenings.

CREATE TABLE users (
	id TEXT PRIMARY KEY,
	username TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_users_username ON users (username COLLATE NOCASE);

CREATE TABLE favorites (
	user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	screening_id TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (user_id, screening_id)
);

CREATE INDEX idx_favorites_user ON favorites (user_id);
