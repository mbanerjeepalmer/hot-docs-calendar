#!/usr/bin/env node
// Fetches the Sarajevo Film Festival 2026 schedule sources to scripts/data/.
// Run with: npm run fetch:sources
//
// Why plain fetch and not a browser: tickets.sff.ba is a React SPA, but it
// talks to a plain JSON API at api3.sff.ba. We hit that API directly instead
// of driving a browser to render the SPA.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = new URL('./data/', import.meta.url);
const OUT_DIR = OUT.pathname;

const API_BASE = 'https://api3.sff.ba';

const SOURCES = [
	{ name: 'edition.json', path: '/editions/current/basic' },
	{ name: 'screenings.json', path: '/screenings/online?RetrieveAll=true' },
	{
		name: 'films.json',
		path:
			'/films?RetrieveAll=true' +
			'&Includes=FilmSections.Section.SectionTranslations.Language' +
			'&Includes=FilmPhotos' +
			'&Includes=FilmSynopses.Language' +
			'&Includes=FilmCountries.Country' +
			'&Includes=FilmLanguages.Language'
	}
];

async function fetchJson({ name, path }) {
	const url = `${API_BASE}${path}`;
	console.log(`→ GET ${url}`);
	const res = await fetch(url, { headers: { accept: 'application/json' } });
	if (!res.ok) throw new Error(`${url} failed: ${res.status} ${res.statusText}`);
	const body = await res.text();
	const out = join(OUT_DIR, name);
	await writeFile(out, body);
	console.log(`  wrote ${out} (${body.length.toLocaleString()} bytes)`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const source of SOURCES) await fetchJson(source);
console.log('\nDone. Commit the files in scripts/data/ and push.');
