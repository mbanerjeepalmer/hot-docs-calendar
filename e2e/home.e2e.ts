import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
	test('shows the Sarajevo festival identity and dates', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1 })).toContainText(/sarajevo/i);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('2026');
		await expect(page.getByText('14 – 21 August 2026')).toBeVisible();
	});

	test('explains that the official programme is coming soon', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /see you in sarajevo/i })).toBeVisible();
		await expect(page.getByText(/screening times and venues have not been published/i)).toBeVisible();
		await expect(page.getByRole('link', { name: /visit sff.ba/i })).toHaveAttribute(
			'href',
			'https://www.sff.ba/en'
		);
	});
});
