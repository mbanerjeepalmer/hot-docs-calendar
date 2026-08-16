#!/usr/bin/env node
// Combine scripts/data/{screenings,films,edition}.json (from api3.sff.ba) into
// src/lib/data/screenings.json.
//
// Run with: node scripts/parse-sff.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const DATA_DIR = new URL('./data/', import.meta.url);
const OUT = new URL('../src/lib/data/screenings.json', import.meta.url);

const TICKET_BASE_URL = 'https://tickets.sff.ba';

// Sarajevo runs on CEST (UTC+2) year-round in mid-August; no DST transition
// falls inside the festival window (Aug 14–21, 2026).
const TZ_OFFSET = '+02:00';

const TUZLA_VENUES = new Set(['Bingo Open Air Cinema Tuzla', 'Bosanski kulturni centar Tuzlanskog kantona']);

function readJson(name) {
	return JSON.parse(readFileSync(new URL(name, DATA_DIR), 'utf8'));
}

function slug(s) {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function addressFor(venue) {
	const city = TUZLA_VENUES.has(venue) ? 'Tuzla' : 'Sarajevo';
	return `${city}, Bosnia and Herzegovina`;
}

function toIso(dateIso, time) {
	// dateIso: "2026-08-21T00:00:00", time: "22:00" — api3.sff.ba sometimes
	// omits the leading zero on single-digit hours (e.g. "9:30"), which makes
	// the resulting string unparseable as a Date, so pad it here.
	const day = dateIso.slice(0, 10);
	const [h, m] = time.split(':');
	const hh = h.padStart(2, '0');
	return `${day}T${hh}:${m}:00${TZ_OFFSET}`;
}

function addMinutesFixedOffset(iso, mins) {
	const d = new Date(iso);
	const shifted = new Date(d.getTime() + mins * 60_000);
	const pad = (n) => String(n).padStart(2, '0');
	// Reconstruct wall-clock time in the +02:00 zone from the UTC instant.
	const utcMs = shifted.getTime() + 2 * 60 * 60_000;
	const local = new Date(utcMs);
	const yyyy = local.getUTCFullYear();
	const mm = pad(local.getUTCMonth() + 1);
	const dd = pad(local.getUTCDate());
	const hh = pad(local.getUTCHours());
	const mi = pad(local.getUTCMinutes());
	return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00${TZ_OFFSET}`;
}

// api3.sff.ba models each seating tier of a venue (e.g. "National Theatre -
// Gallery", "National Theatre - Balcony") as its own sellable screening, even
// when it's the same physical screening in the same room at the same time —
// e.g. the opening-night film at National Theatre shows up 6x. Collapse any
// screenings that share a title, start time, and "base" venue (the part
// before " - ") down to one, preferring the bare venue name if present.
function dedupeSeatingSections(screenings) {
	const groups = new Map();
	for (const s of screenings) {
		const baseVenue = s.location.name.split(' - ')[0];
		const key = `${s.title}|${s.startDate.slice(0, 10)}|${s.startTime}|${baseVenue}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(s);
	}
	const out = [];
	for (const group of groups.values()) {
		if (group.length === 1) {
			out.push(group[0]);
			continue;
		}
		const bareVenue = group.find((s) => !s.location.name.includes(' - '));
		out.push(bareVenue ?? group.slice().sort((a, b) => a.location.name.localeCompare(b.location.name))[0]);
	}
	return out;
}

function cleanProgramme(name) {
	return name.replace(/^32nd SFF\s*-\s*/, '').trim();
}

function programmeOf(film) {
	if (!film?.filmProgrammes?.length) return undefined;
	return film.filmProgrammes.map(cleanProgramme).join(', ');
}

function buildDescription(film) {
	if (!film) return '';
	// Fixed one-line header (country · runtime · programme) followed by the
	// synopsis, so the UI can split header from synopsis with a single slice.
	const header = [film.countriesCsv, film.runtimeSeconds > 0 ? film.runtimeHumanReadable : '', programmeOf(film)]
		.filter(Boolean)
		.join(' · ');
	const synopsis = film.filmSynopsis?.longSynopsis || film.filmSynopsis?.shortSynopsis || '';
	return [header, synopsis].filter(Boolean).join('\n');
}

function imageOf(film) {
	return film?.poster || film?.stillImages?.[0] || undefined;
}

function parse() {
	const edition = readJson('edition.json');
	const rawScreenings = readJson('screenings.json').data;
	const films = readJson('films.json').data;

	const screenings = dedupeSeatingSections(rawScreenings);
	const droppedDuplicates = rawScreenings.length - screenings.length;

	const filmsByTitle = new Map(films.map((f) => [f.title, f]));

	const records = screenings.map((s, idx) => {
		const film = filmsByTitle.get(s.title);
		const start = toIso(s.startDate, s.startTime);
		const filmRuntimeMinutes = film ? Math.round(film.runtimeSeconds / 60) : 0;
		const runtimeMinutes = filmRuntimeMinutes > 0 ? filmRuntimeMinutes : 120;
		const end = addMinutesFixedOffset(start, runtimeMinutes);
		const venue = s.location.name;
		return {
			id: `${slug(s.title)}-${start.slice(0, 10)}-${start.slice(11, 16).replace(':', '')}-${idx}`,
			title: s.title,
			start,
			end,
			venue,
			address: addressFor(venue),
			description: buildDescription(film),
			ticketUrl: film ? `${TICKET_BASE_URL}/films/${film.id}` : `${TICKET_BASE_URL}/screenings`,
			image: imageOf(film),
			programme: programmeOf(film)
		};
	});

	records.sort((a, b) => a.start.localeCompare(b.start));

	const matched = records.filter((r) => r.description).length;
	console.log(
		`${edition.name}: parsed ${records.length} screenings (${matched} matched to a film record, ` +
			`${droppedDuplicates} seating-section duplicates dropped)`
	);
	const venueCounts = records.reduce((acc, r) => ((acc[r.venue] = (acc[r.venue] ?? 0) + 1), acc), {});
	console.log('By venue:', venueCounts);

	writeFileSync(OUT, JSON.stringify(records, null, '\t') + '\n');
	console.log(`Wrote ${OUT.pathname}`);
}

parse();
