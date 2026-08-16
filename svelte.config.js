import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Deploys as a Cloudflare Worker with static assets; config lives in wrangler.jsonc.
		// See https://svelte.dev/docs/kit/adapter-cloudflare
		adapter: adapter()
	}
};

export default config;
