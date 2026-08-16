import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
	test('shows festival title and dates', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/sarajevo/i);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('2026');
	});

	test('lists screening cards with title, time, and venue', async ({ page }) => {
		await page.goto('/');
		const cards = page.getByTestId('screening');
		await expect(cards.first()).toBeVisible();
		expect(await cards.count()).toBeGreaterThan(0);

		const first = cards.first();
		await expect(first.getByTestId('screening-title')).toBeVisible();
		await expect(first.getByTestId('screening-datetime')).toBeVisible();
		await expect(first.getByTestId('screening-venue')).toBeVisible();
	});

	test('groups screenings by day with visible date headings', async ({ page }) => {
		await page.goto('/');
		const dayHeadings = page.getByTestId('day-heading');
		expect(await dayHeadings.count()).toBeGreaterThan(0);
		await expect(dayHeadings.first()).toBeVisible();
	});

	test('filters screenings by title search', async ({ page }) => {
		await page.goto('/');
		const totalBefore = await page.getByTestId('screening').count();
		expect(totalBefore).toBeGreaterThan(1);

		const firstTitle = (await page
			.getByTestId('screening-title')
			.first()
			.innerText()) as string;

		await page.getByRole('searchbox', { name: /search/i }).fill(firstTitle);
		await expect(page.getByTestId('screening').first()).toBeVisible();
		const totalAfter = await page.getByTestId('screening').count();
		expect(totalAfter).toBeLessThanOrEqual(totalBefore);
		expect(totalAfter).toBeGreaterThan(0);
	});
});

test.describe('Google Calendar export', () => {
	test('each screening has an Add to Google Calendar link', async ({ page }) => {
		await page.goto('/');
		const first = page.getByTestId('screening').first();
		const gcal = first.getByRole('link', { name: /google calendar/i });
		await expect(gcal).toBeVisible();

		const href = await gcal.getAttribute('href');
		expect(href).toBeTruthy();
		const url = new URL(href!);
		expect(url.host).toBe('calendar.google.com');
		expect(url.pathname).toBe('/calendar/render');
		expect(url.searchParams.get('action')).toBe('TEMPLATE');
		expect(url.searchParams.get('text')).toBeTruthy();
		expect(url.searchParams.get('location')).toBeTruthy();

		const dates = url.searchParams.get('dates');
		expect(dates).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
	});

	test('Google Calendar link opens in a new tab', async ({ page }) => {
		await page.goto('/');
		const gcal = page.getByTestId('screening').first().getByRole('link', { name: /google calendar/i });
		await expect(gcal).toHaveAttribute('target', '_blank');
		await expect(gcal).toHaveAttribute('rel', /noopener/);
	});
});
