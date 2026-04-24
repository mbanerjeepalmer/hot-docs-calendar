#!/usr/bin/env node
// Parse the Hot Docs 2026 schedule PDF (already extracted with pdftotext -raw)
// into src/lib/data/screenings.json.
//
// Run with: node scripts/parse-pdf.mjs
//
// Prereq: scripts/data/HD26_Screening-Schedule.raw.txt produced via
//   pdftotext -raw scripts/data/HD26_Screening-Schedule.pdf scripts/data/HD26_Screening-Schedule.raw.txt

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('./data/HD26_Screening-Schedule.raw.txt', import.meta.url);
const OUT = new URL('../src/lib/data/screenings.json', import.meta.url);

const TICKET_BASE_URL =
	'https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b';

const VENUES = {
	'HOT DOCS CINEMA': {
		name: 'Hot Docs Ted Rogers Cinema',
		address: '506 Bloor St W, Toronto, ON'
	},
	'TLB 1': { name: 'TIFF Lightbox – Cinema 1', address: '350 King St W, Toronto, ON' },
	'TLB 2': { name: 'TIFF Lightbox – Cinema 2', address: '350 King St W, Toronto, ON' },
	'TLB 3': { name: 'TIFF Lightbox – Cinema 3', address: '350 King St W, Toronto, ON' },
	'TLB 4': { name: 'TIFF Lightbox – Cinema 4', address: '350 King St W, Toronto, ON' }
};

const MONTHS = {
	JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
	JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, JUNE: 6, JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12
};

const SCREENING_RE =
	/^(MON|TUE|WED|THU|FRI|SAT|SUN),\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\s+(HOT DOCS CINEMA|TLB [1-4])(\*?)\s*(.*)$/;

// Lines that always cap the title walk-back (never include, stop walking).
const TITLE_BOUNDARY = new Set([
	'WORLD PREMIERE',
	'INTERNATIONAL PREMIERE',
	'NORTH AMERICAN PREMIERE',
	'CANADIAN PREMIERE',
	'TORONTO PREMIERE',
	'Screening with',
	'and'
]);

// Section/program headings that appear above a film's premiere/title block.
// They are valid as a title only when they ARE the line immediately above D:
// (e.g. HOUSE OF HOPE is both a section name and a film title). When walking
// further up, they should not be treated as part of a multi-line title.
const SECTION_HEADINGS = new Set([
	'SPECIAL PRESENTATIONS',
	'SPECIAL EVENTS',
	'CANADIAN SPECTRUM',
	'CANADIAN SPECTRUM COMPETITION',
	'INTERNATIONAL SPECTRUM',
	'INTERNATIONAL SPECTRUM COMPETITION',
	'WORLD SHOWCASE',
	'BIG IDEAS',
	'MADE IN BRAZIL',
	'ARTSCAPES',
	'PERSISTER',
	'DIGITAL WITNESSES',
	'SHORTS',
	'SHORTS PROGRAMS',
	'SCHEDULE AT A GLANCE',
	'TITLE INDEX',
	'LEGEND',
	'TRUE NORTH',
	'PERSISTENT VISIONS',
	'FEATURE FILMS IN JURIED COMPETITION',
	'NIGHTVISIONS',
	'MARKERS',
	'OUTSPOKEN',
	'MIDNIGHT MADNESS',
	'CONFRONTATIONS',
	'SYSTEMS'
]);

function isFooter(line) {
	return (
		/^hotdocs\.ca\b/i.test(line) ||
		/HOT DOCS CANADIAN INTERNATIONAL DOCUMENTARY FESTIVAL/.test(line) ||
		/APRIL 23.*MAY 3, 2026/.test(line) ||
		/^p\.\s*\d+/.test(line) ||
		/^\d+\s*:\s*hotdocs\.ca/.test(line) ||
		line.startsWith('\f')
	);
}

function isTitleLine(line) {
	const t = line.replace(/^\f/, '').trim();
	if (!t) return false;
	if (TITLE_BOUNDARY.has(t)) return false;
	if (isFooter(t)) return false;
	if (SCREENING_RE.test(t)) return false;
	if (/^D:\s/.test(t)) return false;
	return true;
}

function slug(s) {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function toIso({ month, day, hour24, minute }) {
	const yyyy = 2026;
	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	const hh = String(hour24).padStart(2, '0');
	const mi = String(minute).padStart(2, '0');
	// Hot Docs runs Apr 23 – May 3; all of that is EDT (UTC-04:00).
	return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00-04:00`;
}

function addMinutes(iso, mins) {
	const d = new Date(iso);
	const tzOffsetMin = 4 * 60; // EDT, fixed for the festival window
	const local = new Date(d.getTime() - tzOffsetMin * 60_000 + mins * 60_000);
	const yyyy = local.getUTCFullYear();
	const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(local.getUTCDate()).padStart(2, '0');
	const hh = String(local.getUTCHours()).padStart(2, '0');
	const mi = String(local.getUTCMinutes()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00-04:00`;
}

function parseDirectorLine(rawLines, dIndex) {
	let line = rawLines[dIndex];
	let consumed = 1;
	while (!/\|\s*\d+\s*min\s*$/i.test(line) && dIndex + consumed < rawLines.length) {
		const next = rawLines[dIndex + consumed];
		if (!next || SCREENING_RE.test(next)) break;
		line = `${line} ${next.trim()}`;
		consumed++;
		if (consumed > 4) break;
	}
	const m = line.match(/^D:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*min\s*$/i);
	if (!m) return { consumed, info: null };
	return {
		consumed,
		info: {
			directors: m[1].trim(),
			countries: m[2].trim(),
			runtime: parseInt(m[3], 10)
		}
	};
}

function looksAllCaps(line) {
	const ascii = line.match(/[A-Za-z]/g) ?? [];
	if (ascii.length === 0) return true; // non-Latin script (e.g. Salish)
	const upper = ascii.filter((c) => c >= 'A' && c <= 'Z').length;
	return upper / ascii.length >= 0.6;
}

function findTitle(rawLines, dIndex, knownTitles) {
	// Line directly above D: is always the (last line of) the title — that's
	// the layout invariant in the catalog. We then keep walking up only while
	// the line still looks like an all-caps title fragment, so synopsis prose
	// from the previous entry doesn't leak in.
	const parts = [];
	let i = dIndex - 1;
	let firstAccepted = false;
	while (i >= 0) {
		const raw = rawLines[i].replace(/^\f/, '').trim();
		if (!raw) {
			i--;
			continue;
		}
		if (!isTitleLine(raw)) break;
		if (firstAccepted) {
			if (!looksAllCaps(raw)) break;
			if (SECTION_HEADINGS.has(raw)) break;
			// Section TOC pages list multiple sibling titles in a row above the
			// first film. If a candidate continuation line is itself a known
			// (line-directly-above-D:) primary title, it's a sibling — stop.
			if (knownTitles && knownTitles.has(raw)) break;
			// Long lines are usually two TOC entries concatenated by pdftotext.
			if (raw.length > 60) break;
		}
		parts.unshift(raw);
		firstAccepted = true;
		i--;
		if (parts.length >= 3) break;
	}
	return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function collectScreenings(rawLines, startIndex) {
	const out = [];
	let i = startIndex;
	while (i < rawLines.length) {
		const raw = rawLines[i].replace(/^\f/, '').trim();
		const m = raw.match(SCREENING_RE);
		if (m) {
			const [, , mon, day, h, min, mer, venueRaw, star, suffix] = m;
			let hour24 = parseInt(h, 10) % 12;
			if (mer === 'PM') hour24 += 12;
			out.push({
				month: MONTHS[mon],
				day: parseInt(day, 10),
				hour24,
				minute: parseInt(min, 10),
				venueCode: venueRaw,
				special: star === '*',
				suffix: suffix.trim()
			});
		}
		i++;
		if (i < rawLines.length) {
			const next = rawLines[i].replace(/^\f/, '').trim();
			if (!next) continue;
			if (SCREENING_RE.test(next)) continue;
			// Stop when we encounter the next film's premiere/title block.
			if (isFooter(next)) continue;
			if (TITLE_BOUNDARY.has(next)) continue;
			if (out.length === 0) continue; // we haven't found any screenings yet, keep scanning the synopsis
			break;
		}
	}
	return { screenings: out, nextIndex: i };
}

function buildScreeningRecords(film) {
	return film.screenings.map((s, idx) => {
		const start = toIso(s);
		const end = addMinutes(start, film.runtime);
		const venue = VENUES[s.venueCode];
		const ticketUrl = `${TICKET_BASE_URL}&search=${encodeURIComponent(film.title)}`;
		const description = [
			`D: ${film.directors}`,
			`${film.countries} · ${film.runtime} min`,
			film.synopsis,
			s.special ? 'Includes Q&A or special programming.' : '',
			s.suffix ? s.suffix : ''
		]
			.filter(Boolean)
			.join('\n');
		return {
			id: `${slug(film.title)}-${start.slice(0, 10)}-${start.slice(11, 16).replace(':', '')}-${idx}`,
			title: film.title,
			start,
			end,
			venue: venue.name,
			address: venue.address,
			description,
			ticketUrl
		};
	});
}

function collectKnownTitles(lines) {
	// Pass 1: line directly above each D: is always part of the title. Build
	// a set of these primary lines so the multi-line title walker can detect
	// sibling films listed in section-TOC pages.
	const set = new Set();
	for (let i = 1; i < lines.length; i++) {
		const cur = lines[i].replace(/^\f/, '').trim();
		if (!/^D:\s/.test(cur)) continue;
		let j = i - 1;
		while (j >= 0) {
			const t = lines[j].replace(/^\f/, '').trim();
			if (t) {
				if (!TITLE_BOUNDARY.has(t) && !SCREENING_RE.test(t) && !isFooter(t)) {
					set.add(t);
				}
				break;
			}
			j--;
		}
	}
	return set;
}

function parse() {
	const text = readFileSync(SRC, 'utf8');
	const lines = text.split('\n');
	const knownTitles = collectKnownTitles(lines);
	const films = [];

	const skipped = [];
	for (let i = 0; i < lines.length; i++) {
		if (!/^D:\s/.test(lines[i].replace(/^\f/, '').trim())) continue;
		// Re-find the d-line index from the trimmed string so consumed counts work.
		const { consumed, info } = parseDirectorLine(
			lines.map((l) => l.replace(/^\f/, '').trim()),
			i
		);
		if (!info) {
			skipped.push({ line: i + 1, reason: 'no info', text: lines[i] });
			continue;
		}
		const title = findTitle(lines, i, knownTitles);
		if (!title) {
			skipped.push({ line: i + 1, reason: 'no title', text: lines[i] });
			continue;
		}

		const synopsisStart = i + consumed;
		const { screenings, nextIndex } = collectScreenings(lines, synopsisStart);

		// Synopsis is lines between director block and the first screening line.
		let firstScreening = synopsisStart;
		while (firstScreening < lines.length) {
			const t = lines[firstScreening].replace(/^\f/, '').trim();
			if (SCREENING_RE.test(t)) break;
			firstScreening++;
		}
		const synopsis = lines
			.slice(synopsisStart, firstScreening)
			.map((l) => l.replace(/^\f/, '').trim())
			.filter((l) => l && !isFooter(l) && !TITLE_BOUNDARY.has(l))
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();

		if (screenings.length === 0) {
			skipped.push({ line: i + 1, reason: 'no screenings', title });
			continue;
		}
		films.push({ title, ...info, synopsis, screenings });
	}
	if (skipped.length) {
		console.warn(`Skipped ${skipped.length}:`);
		for (const s of skipped) console.warn(' ', s);
	}

	const records = films.flatMap(buildScreeningRecords);
	records.sort((a, b) => a.start.localeCompare(b.start));

	console.log(`Parsed ${films.length} films, ${records.length} screenings`);
	const venueCounts = records.reduce((acc, r) => ((acc[r.venue] = (acc[r.venue] ?? 0) + 1), acc), {});
	console.log('By venue:', venueCounts);

	writeFileSync(OUT, JSON.stringify(records, null, '\t') + '\n');
	console.log(`Wrote ${OUT.pathname}`);
}

parse();
