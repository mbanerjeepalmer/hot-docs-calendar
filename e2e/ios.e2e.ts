import { expect, test } from '@playwright/test';

// Mobile-viewport regressions that bite iOS users: layout overflow on a 390pt
// screen, target=_blank on the webcal:// link (which would suppress the iOS
// Calendar.app hand-off), and tap targets below Apple's 44pt minimum. The
// project emulates a small phone; the markup we're asserting is engine-
// independent so this catches what would break on real iOS too.

test.describe('Mobile viewport (proxy for iOS)', () => {
	test('layout fits within the viewport (no horizontal scroll)', async ({ page }) => {
		await page.goto('/');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test('webcal:// subscribe link does NOT have target=_blank', async ({ page }) => {
		// On iOS, target=_blank on a webcal:// link opens an empty new tab and
		// suppresses the Calendar.app hand-off. Same-tab navigation triggers the
		// "Subscribe to calendar?" sheet correctly.
		await page.goto('/');
		const link = page.getByTestId('subscribe-webcal');
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', /^webcal:\/\//);
		const target = await link.getAttribute('target');
		expect(target).not.toBe('_blank');
	});

	test('subscribe and per-screening tap targets are at least 44pt tall', async ({ page }) => {
		// Apple HIG: minimum 44×44 pt for reliable tap accuracy.
		await page.goto('/');
		const targets = [
			page.getByTestId('subscribe-google'),
			page.getByTestId('subscribe-webcal'),
			page.getByTestId('subscribe-ics'),
			page.getByTestId('screening').first().getByRole('link', { name: /google calendar/i })
		];
		for (const t of targets) {
			const box = await t.boundingBox();
			expect(box, `missing bounding box`).not.toBeNull();
			expect(box!.height, `tap target ${(await t.textContent())?.trim()} too short`).toBeGreaterThanOrEqual(44);
		}
	});
});
