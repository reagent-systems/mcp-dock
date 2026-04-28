import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';
import type { ReleaseAsset } from '$lib/github-release-download';

/** Real production host for canonical OG/URLs when env is not set. Override with PUBLIC_SITE_URL if needed. */
const DEFAULT_PRODUCTION_SITE = 'https://mcp-dock.reagent-systems.com';

const GITHUB_REPO = 'reagent-systems/mcp-dock';

/**
 * Prefer PUBLIC_SITE_URL, then the built-in production origin, else the request (dev: localhost;
 * `vite build`+preview: production URL in meta for easier OG checks).
 */
export const load: LayoutServerLoad = async ({ url, fetch }) => {
	const fromEnv = env.PUBLIC_SITE_URL?.replace(/\/$/, '').trim() ?? '';
	const siteUrl = fromEnv || (import.meta.env.DEV ? url.origin : DEFAULT_PRODUCTION_SITE);

	let releaseAssets: ReleaseAsset[] = [];
	try {
		const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
			headers: {
				Accept: 'application/vnd.github+json',
				'User-Agent': 'mcp-dock-website',
			},
		});
		if (res.ok) {
			const body = (await res.json()) as { assets?: { name?: string; browser_download_url?: string }[] };
			releaseAssets = (body.assets ?? []).flatMap((a) =>
				a.name && a.browser_download_url
					? [{ name: a.name, browser_download_url: a.browser_download_url }]
					: []
			);
		}
	} catch {
		// leave releaseAssets empty
	}

	return { siteUrl, releaseAssets };
};
