const STORAGE_KEY = 'sff-2026-saved-lists';

export const LIST_NAMES = ['tickets', 'shortlist', 'longlist'] as const;
export type ListName = (typeof LIST_NAMES)[number];

export const LIST_LABELS: Record<ListName, string> = {
	tickets: 'Have tickets',
	shortlist: 'Shortlist',
	longlist: 'Longlist'
};

export type SavedLists = Record<ListName, string[]>;

function emptyLists(): SavedLists {
	return { tickets: [], shortlist: [], longlist: [] };
}

function load(): SavedLists {
	if (typeof localStorage === 'undefined') return emptyLists();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return emptyLists();
		const parsed = JSON.parse(raw);
		const out = emptyLists();
		for (const name of LIST_NAMES) {
			if (Array.isArray(parsed[name])) out[name] = parsed[name].filter((id: unknown) => typeof id === 'string');
		}
		return out;
	} catch {
		return emptyLists();
	}
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export const lists: SavedLists = $state(load());

export function listOf(id: string): ListName | null {
	for (const name of LIST_NAMES) {
		if (lists[name].includes(id)) return name;
	}
	return null;
}

// Every screening belongs to at most one list at a time: adding to one
// removes it from the others.
export function addTo(id: string, list: ListName) {
	for (const name of LIST_NAMES) {
		const i = lists[name].indexOf(id);
		if (i !== -1) lists[name].splice(i, 1);
	}
	lists[list].unshift(id);
	persist();
}

export function removeFrom(id: string) {
	for (const name of LIST_NAMES) {
		const i = lists[name].indexOf(id);
		if (i !== -1) lists[name].splice(i, 1);
	}
	persist();
}

export function move(list: ListName, index: number, direction: -1 | 1) {
	const arr = lists[list];
	const target = index + direction;
	if (target < 0 || target >= arr.length) return;
	[arr[index], arr[target]] = [arr[target], arr[index]];
	persist();
}
