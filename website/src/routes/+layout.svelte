<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/brand/favicon.svg" />
	<title>MCP Dock</title>
	<meta
		name="description"
		content="Browse the MCP Registry and install servers into Cursor, Claude Desktop, and VS Code."
	/>
	<meta property="og:title" content="MCP Dock" />
	<meta
		property="og:description"
		content="Browse the MCP Registry and install servers into Cursor, Claude Desktop, and VS Code."
	/>
	<meta property="og:type" content="website" />
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
