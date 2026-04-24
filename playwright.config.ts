import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
