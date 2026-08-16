import { expect, test } from '@playwright/test';

// The Playwright preview server (see playwright.config.ts) runs plain
// `vite preview`, with no D1 binding — so these tests cover the static
// markup/options the reaction UI renders, not persistence through
// /api/reactions (that's exercised against a real local D1 via
// `wrangler dev` during development; see README).

test.describe('Reaction controls (schedule page)', () => {
	test('each screening has a reaction select with mini star, mega star, and tickets options', async ({
		page
	}) => {
		await page.goto('/');
		const select = page.getByTestId('reaction-select').first();
		await expect(select).toBeVisible();
		const options = await select.locator('option').allTextContents();
		expect(options).toEqual(['No reaction', '☆ Mini star', '★ Mega star', '🎟 Want tickets']);
	});

	test('filter bar offers a reaction filter with mine/mini/mega/tickets options', async ({ page }) => {
		await page.goto('/');
		const select = page.getByTestId('reaction-filter');
		await expect(select).toBeVisible();
		const options = await select.locator('option').allTextContents();
		expect(options).toEqual(['All screenings', 'My reactions', '☆ Mini star', '★ Mega star', '🎟 Tickets wanted']);
	});

	test('header links to the aggregate reactions page', async ({ page }) => {
		await page.goto('/');
		const link = page.getByTestId('my-list-link');
		await expect(link).toHaveAttribute('href', '/list');
		await expect(link).toContainText('Reactions');
	});
});

test.describe('Reactions page (/list)', () => {
	test('shows an empty state when nobody has reacted yet', async ({ page }) => {
		await page.goto('/list');
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/who wants what/i);
		await expect(page.getByTestId('no-reactions')).toBeVisible();
	});
});
