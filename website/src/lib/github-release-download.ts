export type ReleaseAsset = {
	name: string;
	browser_download_url: string;
};

export type DownloadTarget = {
	url: string;
	/** e.g. macOS, Windows — undefined for unknown/other platforms */
	osShort: string | undefined;
};

function platformFromUa(ua: string): 'mac' | 'win' | 'other' {
	if (/Windows/i.test(ua)) return 'win';
	if (/Macintosh|Mac OS X|MacIntel|MacPPC/i.test(ua)) return 'mac';
	return 'other';
}

export function pickDownload(assets: ReleaseAsset[], ua: string): DownloadTarget | null {
	if (!assets.length) return null;
	const p = platformFromUa(ua);
	let chosen: ReleaseAsset | undefined;
	if (p === 'mac') {
		chosen = assets.find((a) => a.name.endsWith('.dmg')) ?? assets.find((a) => a.name.endsWith('.zip'));
	} else if (p === 'win') {
		chosen = assets.find((a) => a.name.endsWith('.exe'));
	} else {
		chosen =
			assets.find((a) => a.name.endsWith('.dmg')) ??
			assets.find((a) => a.name.endsWith('.exe')) ??
			assets[0];
	}
	if (!chosen) chosen = assets[0];

	const osShort = p === 'mac' ? 'macOS' : p === 'win' ? 'Windows' : undefined;
	return { url: chosen.browser_download_url, osShort };
}
