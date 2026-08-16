import { expect, test } from '@playwright/test';
import type { Screening } from '../src/lib/types.js';

const { default: screenings } = await import('../src/lib/data/screenings.json', {
	with: { type: 'json' }
});

function screeningsByFilm(id: number): Screening[] {
	return (screenings as Screening[]).filter((s) => s.filmId === id);
}

const anyFilmId = (screenings as Screening[]).find((s) => s.filmId != null)!.filmId!;

test.describe('Film detail page', () => {
	test('shows title, year, synopsis, and every screening of the film', async ({ page }) => {
		const film = screeningsByFilm(anyFilmId)[0];
		await page.goto(`/films/${anyFilmId}`);

		await expect(page.getByTestId('film-title')).toHaveText(film.title);
		if (film.year) {
			await expect(page.getByTestId('film-year')).toHaveText(String(film.year));
		}
		await expect(page.getByTestId('film-synopsis')).toBeVisible();

		const rows = page.getByTestId('film-screening');
		expect(await rows.count()).toBe(screeningsByFilm(anyFilmId).length);
	});

	test('a screening title on the schedule links to its film page', async ({ page }) => {
		const film = screeningsByFilm(anyFilmId)[0];
		await page.goto('/');
		await page.getByPlaceholder('Search films or venues…').fill(film.title);
		const link = page.getByTestId('screening-title').locator('a').first();
		await expect(link).toHaveAttribute('href', `/films/${anyFilmId}`);
	});

	test('an unknown film id 404s', async ({ page }) => {
		const res = await page.goto('/films/999999999');
		expect(res?.status()).toBe(404);
	});
});
