<script lang="ts">
	import { page } from '$app/stores';
	import '../app.css';

	let { data, children } = $props();

	/** Public page URL and asset base — from +layout.server (canonical host for link previews). */
	const pageUrl = $derived(new URL($page.url.pathname + $page.url.search, data.siteUrl).href);
	const ogImageUrl = $derived(new URL('/brand/og-image.png', data.siteUrl).href);
	const isHttps = $derived(ogImageUrl.startsWith('https:'));
</script>

<svelte:head>
	<link rel="icon" href="/brand/favicon.svg" />
	<link rel="canonical" href={pageUrl} />
	<title>MCP Dock</title>
	<meta
		name="description"
		content="Browse the MCP Registry and install servers into Cursor, Claude Desktop, and VS Code."
	/>
	<meta property="og:url" content={pageUrl} />
	<meta property="og:title" content="MCP Dock" />
	<meta
		property="og:description"
		content="Browse the MCP Registry and install servers into Cursor, Claude Desktop, and VS Code."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:image" content={ogImageUrl} />
	{#if isHttps}
		<meta property="og:image:secure_url" content={ogImageUrl} />
	{/if}
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="MCP Dock — browse the MCP Registry and install servers into Cursor, Claude Desktop, and VS Code."
	/>

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="MCP Dock" />
	<meta
		name="twitter:description"
		content="Browse the MCP Registry and install servers into Cursor, Claude Desktop, and VS Code."
	/>
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<div class="shell">
	<header class="topbar">
		<div class="container topbar-inner">
			<a class="brand" href="/">
				<span class="logo" aria-hidden="true"></span>
				<span>MCP Dock</span>
			</a>

			<nav class="nav" aria-label="Primary">
				<a href="#features">Features</a>
				<a href="#how">How it works</a>
				<a href="#screens">Screens</a>
				<a href="#faq">FAQ</a>
			</nav>

			<div class="btn-row">
				<a class="btn btn-primary" href="https://github.com/reagent-systems/mcp-dock/releases">Download</a>
				<a class="btn" href="https://github.com/reagent-systems/mcp-dock">GitHub</a>
			</div>
		</div>
	</header>

	<main class="main">
		{@render children()}
	</main>

	<footer class="footer">
		<div class="container footer-inner">
			<div>© {new Date().getFullYear()} MCP Dock</div>
			<div class="links">
				<a href="https://github.com/reagent-systems/mcp-dock">Repository</a>
				<a href="https://github.com/reagent-systems/mcp-dock/issues">Issues</a>
				<a href="https://github.com/reagent-systems/mcp-dock/releases">Releases</a>
			</div>
		</div>
	</footer>
</div>
