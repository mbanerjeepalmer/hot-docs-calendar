import { expect, test } from '@playwright/test';

test.describe('Saved lists (localStorage)', () => {
	test('saving a screening updates the My list count and shows it on /list', async ({ page }) => {
		await page.goto('/');
		const first = page.getByTestId('screening').first();
		const title = (await first.getByTestId('screening-title').innerText()) as string;

		await first.getByTestId('save-select').selectOption('shortlist');

		await expect(page.getByTestId('my-list-link')).toContainText('1');

		await page.goto('/list');
		const shortlistColumn = page.getByTestId('list-column-shortlist');
		await expect(shortlistColumn.getByTestId('list-item')).toHaveCount(1);
		await expect(shortlistColumn.getByTestId('list-item-title')).toHaveText(title);
		await expect(page.getByTestId('list-column-tickets').getByTestId('list-item')).toHaveCount(0);
		await expect(page.getByTestId('list-column-longlist').getByTestId('list-item')).toHaveCount(0);
	});

	test('a screening belongs to only one list at a time', async ({ page }) => {
		await page.goto('/');
		const first = page.getByTestId('screening').first();
		await first.getByTestId('save-select').selectOption('shortlist');
		await first.getByTestId('save-select').selectOption('tickets');

		await page.goto('/list');
		await expect(page.getByTestId('list-column-tickets').getByTestId('list-item')).toHaveCount(1);
		await expect(page.getByTestId('list-column-shortlist').getByTestId('list-item')).toHaveCount(0);
	});

	test('reordering within a list moves items up and down', async ({ page }) => {
		await page.goto('/');
		const rows = await page.getByTestId('screening').all();
		const titleA = (await rows[0].getByTestId('screening-title').innerText()) as string;
		const titleB = (await rows[1].getByTestId('screening-title').innerText()) as string;
		// addTo() unshifts, so the most-recently-saved screening lands at the
		// top: saving A then B leaves the list as [B, A].
		await rows[0].getByTestId('save-select').selectOption('longlist');
		await rows[1].getByTestId('save-select').selectOption('longlist');

		await page.goto('/list');
		const column = page.getByTestId('list-column-longlist');
		await expect(column.getByTestId('list-item-title').first()).toHaveText(titleB);

		await column.getByTestId('list-item').first().getByRole('button', { name: /move .* down/i }).click();

		await expect(column.getByTestId('list-item-title').first()).toHaveText(titleA);
	});

	test('removing an item takes it out of the list', async ({ page }) => {
		await page.goto('/');
		const first = page.getByTestId('screening').first();
		await first.getByTestId('save-select').selectOption('tickets');

		await page.goto('/list');
		const column = page.getByTestId('list-column-tickets');
		await expect(column.getByTestId('list-item')).toHaveCount(1);
		await column.getByRole('button', { name: /remove/i }).click();
		await expect(column.getByTestId('list-item')).toHaveCount(0);
		await expect(column.getByText('Nothing here yet.')).toBeVisible();
	});

	test('saved lists persist across a reload', async ({ page }) => {
		await page.goto('/');
		const first = page.getByTestId('screening').first();
		await first.getByTestId('save-select').selectOption('shortlist');

		await page.reload();
		await expect(page.getByTestId('screening').first().getByTestId('save-select')).toHaveValue('shortlist');
	});
});

test.describe('Programme hover badge', () => {
	test('programme badge is hidden by default and revealed on hover', async ({ page }) => {
		await page.goto('/');
		const withProgramme = page.getByTestId('screening').filter({ has: page.getByTestId('screening-programme') }).first();
		const badge = withProgramme.getByTestId('screening-programme');
		await expect(badge).toBeHidden();
		await withProgramme.hover();
		await expect(badge).toBeVisible();
	});
});

test.describe('Sticky day headings', () => {
	test('day heading is position: sticky', async ({ page }) => {
		await page.goto('/');
		const heading = page.getByTestId('day-heading').first();
		const position = await heading.evaluate((el) => getComputedStyle(el.parentElement!).position);
		expect(position).toBe('sticky');
	});
});
