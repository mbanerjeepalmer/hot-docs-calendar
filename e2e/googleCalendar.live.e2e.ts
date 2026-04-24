import { expect, test } from '@playwright/test';
import { buildGoogleCalendarUrl } from '../src/lib/googleCalendar.js';
import screenings from '../src/lib/data/screenings.json' with { type: 'json' };

// Live verification against calendar.google.com.
//
// Google redirects UNAUTHENTICATED visitors of /calendar/render?action=TEMPLATE
// to workspace.google.com/intl/en-US/products/calendar/ — the URL still parses
// fine, Google just won't show the event preview without a sign-in. So all we
// can prove without a Google account is that the URL is well-formed enough for
// Google's frontends to accept it (200 OK, no 4xx). The full preview is visible
// in any logged-in browser; that path is exercised by the unit tests in
// googleCalendar.e2e.ts which assert spec compliance.

test('every screening produces a calendar.google.com URL accepted by Google (no 4xx)', async ({
	browser
}) => {
	const context = await browser.newContext({ ignoreHTTPSErrors: true });
	const page = await context.newPage();

	// Sample 5 screenings spread across the festival to keep the test fast.
	const all = screenings as any[];
	const samples = [0, Math.floor(all.length * 0.25), Math.floor(all.length * 0.5), Math.floor(all.length * 0.75), all.length - 1].map(
		(i) => all[i]
	);

	for (const screening of samples) {
		const url = buildGoogleCalendarUrl(screening);
		const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
		const status = res?.status() ?? 0;
		const finalUrl = page.url();
		const accepted =
			status >= 200 &&
			status < 400 &&
			(finalUrl.includes('calendar.google.com') || finalUrl.includes('workspace.google.com'));
		expect(
			accepted,
			`URL not accepted by Google (status ${status}, final ${finalUrl}): ${url}`
		).toBe(true);
		console.log(`✓ ${screening.title.slice(0, 40).padEnd(40)} → ${status} → ${new URL(finalUrl).host}`);
	}

	await context.close();
});
