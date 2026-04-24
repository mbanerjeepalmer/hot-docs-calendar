#!/usr/bin/env node
// Fetches the Hot Docs 2026 schedule sources to scripts/data/.
// Run with: npm run fetch:sources
//
// Why Playwright and not plain curl: the box office page is rendered by
// ASP.NET client-side widgets that populate the event list after page load.
// A raw HTTP response misses most of the data, so we drive a real browser
// and also capture every XHR/fetch payload the page loads.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const OUT = new URL('./data/', import.meta.url);
const OUT_DIR = OUT.pathname;

const PDF_URL = 'https://s3.amazonaws.com/assets.hotdocs.ca/doc/HD26_Screening-Schedule.pdf';
const LIST_URL =
	'https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b&';

function safeName(url) {
	return url.replace(/^https?:\/\//, '').replace(/[^a-z0-9._-]/gi, '_').slice(-180);
}

async function downloadPdf() {
	console.log(`→ GET ${PDF_URL}`);
	const res = await fetch(PDF_URL);
	if (!res.ok) throw new Error(`PDF download failed: ${res.status} ${res.statusText}`);
	const buf = Buffer.from(await res.arrayBuffer());
	const out = join(OUT_DIR, 'HD26_Screening-Schedule.pdf');
	await writeFile(out, buf);
	console.log(`  wrote ${out} (${buf.length.toLocaleString()} bytes)`);
}

async function captureBoxOffice() {
	console.log(`→ launching chromium`);
	let browser;
	try {
		browser = await chromium.launch();
	} catch (err) {
		if (/Executable doesn't exist|install/i.test(String(err))) {
			console.log('  chromium not installed, running `playwright install chromium`…');
			const { execSync } = await import('node:child_process');
			execSync('npx playwright install chromium', { stdio: 'inherit' });
			browser = await chromium.launch();
		} else {
			throw err;
		}
	}
	const context = await browser.newContext({
		userAgent:
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
		viewport: { width: 1440, height: 900 }
	});
	const page = await context.newPage();

	const xhrLog = [];
	const jsonDir = join(OUT_DIR, 'xhr');
	await mkdir(jsonDir, { recursive: true });

	page.on('response', async (response) => {
		const req = response.request();
		const type = req.resourceType();
		if (!['xhr', 'fetch', 'document'].includes(type)) return;
		const url = response.url();
		const ct = (response.headers()['content-type'] || '').toLowerCase();
		try {
			if (ct.includes('json')) {
				const body = await response.text();
				const name = `${Date.now()}_${safeName(url)}.json`;
				await writeFile(join(jsonDir, name), body);
				xhrLog.push({ url, status: response.status(), contentType: ct, saved: name });
			} else {
				xhrLog.push({ url, status: response.status(), contentType: ct });
			}
		} catch (err) {
			xhrLog.push({ url, status: response.status(), contentType: ct, error: String(err) });
		}
	});

	console.log(`→ GET ${LIST_URL}`);
	await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});

	// Give any late-bound widgets another moment to populate, then scroll to
	// force lazy rendering of the full list.
	await page.waitForTimeout(2_000);
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			let y = 0;
			const timer = setInterval(() => {
				window.scrollTo(0, y);
				y += 400;
				if (y > document.body.scrollHeight + 1000) {
					clearInterval(timer);
					resolve();
				}
			}, 150);
		});
	});
	await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

	const html = await page.content();
	await writeFile(join(OUT_DIR, 'list.html'), html);
	console.log(`  wrote ${join(OUT_DIR, 'list.html')} (${html.length.toLocaleString()} bytes)`);

	const png = await page.screenshot({ fullPage: true });
	await writeFile(join(OUT_DIR, 'list.png'), png);
	console.log(`  wrote ${join(OUT_DIR, 'list.png')} (${png.length.toLocaleString()} bytes)`);

	await writeFile(join(OUT_DIR, 'xhr-log.json'), JSON.stringify(xhrLog, null, 2));
	console.log(`  wrote ${join(OUT_DIR, 'xhr-log.json')} (${xhrLog.length} entries)`);

	await browser.close();
}

await mkdir(OUT_DIR, { recursive: true });
await downloadPdf();
await captureBoxOffice();
console.log('\nDone. Commit the files in scripts/data/ and push.');
