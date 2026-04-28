export type ReleaseAsset = {
	name: string;
	browser_download_url: string;
};

export type DownloadTarget = {
	url: string;
	/** e.g. macOS, Windows — undefined for unknown/other platforms */
	osShort: string | undefined;
};

function platformFromUa(ua: string): 'mac' | 'win' | 'linux' | 'other' {
	if (/Windows/i.test(ua)) return 'win';
	if (/Macintosh|Mac OS X|MacIntel|MacPPC/i.test(ua)) return 'mac';
	if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
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
	} else if (p === 'linux') {
		chosen = assets.find((a) => a.name.endsWith('.tar.gz'));
	} else {
		chosen =
			assets.find((a) => a.name.endsWith('.dmg')) ??
			assets.find((a) => a.name.endsWith('.exe')) ??
			assets.find((a) => a.name.endsWith('.tar.gz')) ??
			assets[0];
	}
	if (!chosen) chosen = assets[0];

	const osShort =
		p === 'mac' ? 'macOS' : p === 'win' ? 'Windows' : p === 'linux' ? 'Linux' : undefined;
	return { url: chosen.browser_download_url, osShort };
}
