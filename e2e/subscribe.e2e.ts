import { expect, test } from '@playwright/test';

test.describe('Subscribe to all screenings', () => {
	test('GET /calendar.ics returns text/calendar with every screening', async ({ request }) => {
		const res = await request.get('/calendar.ics');
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toContain('text/calendar');
		const body = await res.text();
		expect(body).toContain('BEGIN:VCALENDAR');
		expect(body).toContain('END:VCALENDAR');
		const eventCount = (body.match(/BEGIN:VEVENT/g) ?? []).length;
		expect(eventCount).toBeGreaterThan(100);
	});

	test('home page shows a Subscribe in Google Calendar button pointing at our ICS', async ({
		page
	}) => {
		await page.goto('/');
		const link = page.getByRole('link', { name: /subscribe.*google calendar/i });
		await expect(link).toBeVisible();
		const href = await link.getAttribute('href');
		expect(href).toBeTruthy();
		const url = new URL(href!);
		expect(url.host).toBe('calendar.google.com');
		expect(url.searchParams.get('cid')).toBeTruthy();
		const cid = url.searchParams.get('cid')!;
		expect(cid).toMatch(/^https?:\/\/.+\/calendar\.ics$/);
	});

	test('home page shows a webcal:// subscribe link for any calendar app', async ({ page }) => {
		await page.goto('/');
		const link = page.getByRole('link', { name: /subscribe.*(other|apple|outlook|app)/i });
		await expect(link).toBeVisible();
		const href = await link.getAttribute('href');
		expect(href).toMatch(/^webcal:\/\/.+\/calendar\.ics$/);
	});
});
