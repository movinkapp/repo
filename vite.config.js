import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Dev-only fixes for `npm run dev` hanging. Production build is unchanged.
export default defineConfig(({ command }) => {
	const dev = command === 'serve';
	return {
		plugins: [sveltekit()],
		resolve: dev
			? {
					// lucide-svelte barrel makes Vite SSR compile ~1700 icons; use only the ones we import.
					alias: [
						{ find: /^lucide-svelte$/, replacement: fileURLToPath(new URL('./src/lib/icons.js', import.meta.url)) }
					]
				}
			: undefined,
		// Vite's SSR transform hangs on @sentry/sveltekit and is slow on auth-helpers: load them as plain Node modules.
		ssr: dev ? { external: ['@sentry/sveltekit', '@supabase/auth-helpers-sveltekit'] } : undefined
	};
});
