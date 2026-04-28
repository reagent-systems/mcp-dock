<script lang="ts">
	import { onMount } from 'svelte';
	import type { ReleaseAsset } from '$lib/github-release-download';
	import { pickDownload } from '$lib/github-release-download';

	let {
		assets = [],
		linkClass = '',
		variant = 'compact',
	}: {
		assets?: ReleaseAsset[];
		linkClass?: string;
		variant?: 'compact' | 'hero';
	} = $props();

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	const resolved = $derived(
		mounted && assets.length ? pickDownload(assets, navigator.userAgent) : null
	);

	const label = $derived.by(() => {
		if (variant === 'compact') return 'Download';
		if (!mounted) return 'Download';
		if (resolved?.osShort) return `Download for ${resolved.osShort}`;
		return 'Download';
	});
</script>

{#if resolved}
	<a class={linkClass} href={resolved.url} rel="noopener noreferrer">{label}</a>
{:else}
	<span class={linkClass} aria-disabled="true" aria-busy={mounted ? false : assets.length > 0}>{label}</span>
{/if}
