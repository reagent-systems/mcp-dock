import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';

/** Real production host for canonical OG/URLs when env is not set. Override with PUBLIC_SITE_URL if needed. */
const DEFAULT_PRODUCTION_SITE = 'https://mcp-dock.reagent-systems.com';

/**
 * Prefer PUBLIC_SITE_URL, then the built-in production origin, else the request (dev: localhost;
 * `vite build`+preview: production URL in meta for easier OG checks).
 */
export const load: LayoutServerLoad = ({ url }) => {
	const fromEnv = env.PUBLIC_SITE_URL?.replace(/\/$/, '').trim() ?? '';
	const siteUrl = fromEnv || (import.meta.env.DEV ? url.origin : DEFAULT_PRODUCTION_SITE);
	return { siteUrl };
};
