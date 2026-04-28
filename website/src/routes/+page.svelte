<script lang="ts">
	import ReleaseDownloadLink from '$lib/ReleaseDownloadLink.svelte';

	let { data } = $props();
	const releaseAssets = $derived(data.releaseAssets);
</script>

<section class="hero">
	<div class="container">
		<div class="hero-grid">
			<div>
				<div class="badge">
					<span aria-hidden="true">◆</span>
					<span>Use MCP Easier</span>
				</div>

				<h1 class="h1">Browse the MCP Registry and install servers in one place.</h1>

				<p class="lead">
					MCP Dock helps you discover MCP servers, review what they do, and install them into Cursor,
					Claude Desktop, and VS Code with a clean, focused workflow.
				</p>

				<div class="btn-row">
					<ReleaseDownloadLink
						linkClass="btn btn-primary"
						variant="hero"
						assets={releaseAssets}
					/>
					<a class="btn" href="https://github.com/reagent-systems/mcp-dock">View on GitHub</a>
				</div>
			</div>

			<div class="card">
				<div class="card-inner">
					<div class="meta">
						<div>
							<strong>What it is</strong>
							<div>A desktop app for managing MCP servers.</div>
						</div>
						<div>
							<strong>Works with</strong>
							<div>Cursor · Claude Code · VS Code</div>
						</div>
						<div>
							<strong>Core loop</strong>
							<div>Discover → Configure → Install</div>
						</div>
					</div>

					<div class="divider"></div>

					<div class="shot has-image">
						<img
							class="shot-img"
							src="/screens/discover.png"
							alt="Discover view showing the MCP registry list"
							loading="lazy"
						/>
						<div class="shot-caption">
							<div>Discover</div>
							<span>Browse the registry</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section id="features" class="section">
	<div class="container">
		<h2>Features</h2>
		<p>Everything you need to go from “what servers exist?” to “it’s installed and working”.</p>

		<div class="grid-3">
			<div class="feature">
				<div class="icon" aria-hidden="true">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
						<path
							d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Z"
							stroke="rgba(255,255,255,0.85)"
							stroke-width="1.6"
						/>
						<path
							d="M7 9h10M7 12h7M7 15h9"
							stroke="rgba(255,255,255,0.55)"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				</div>
				<h3>Registry browsing</h3>
				<p>Find servers by category and quickly understand what each one provides.</p>
			</div>

			<div class="feature">
				<div class="icon" aria-hidden="true">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
						<path
							d="M12 2l3 6 7 .9-5 4.7 1.3 6.9L12 17.9 5.7 20.5 7 13.6 2 8.9 9 8 12 2Z"
							stroke="rgba(255,255,255,0.85)"
							stroke-width="1.6"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<h3>Opinionated defaults</h3>
				<p>Get a sensible starting point, then adjust settings to match your workflow.</p>
			</div>

			<div class="feature">
				<div class="icon" aria-hidden="true">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
						<path
							d="M12 3v12m0 0 4-4m-4 4-4-4"
							stroke="rgba(255,255,255,0.85)"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M5 21h14"
							stroke="rgba(255,255,255,0.55)"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				</div>
				<h3>Install destinations</h3>
				<p>Install into your supported editors and keep the setup consistent across machines.</p>
			</div>
		</div>
	</div>
</section>

<section id="how" class="section">
	<div class="container">
		<h2>How it works</h2>
		<p>A tight loop that keeps you moving without hiding the details.</p>

		<div class="grid-2">
			<div class="feature">
				<h3>1) Discover</h3>
				<p>Browse the registry, compare options, and shortlist what you want to try.</p>
			</div>
			<div class="feature">
				<h3>2) Configure</h3>
				<p>Set up environment variables and settings once, with a clear view of what will be installed.</p>
			</div>
			<div class="feature">
				<h3>3) Install</h3>
				<p>Apply the configuration to your editor(s) and iterate quickly as you test servers.</p>
			</div>
			<div class="feature">
				<h3>4) Maintain</h3>
				<p>Keep track of what you installed, where it went, and what to update next.</p>
			</div>
		</div>
	</div>
</section>

<section id="screens" class="section">
	<div class="container">
		<h2>Screens</h2>
		<p>A quick look at the flow from discovery to install.</p>

		<div class="grid-2">
			<div class="shot has-image">
				<img
					class="shot-img"
					src="/screens/discover.png"
					alt="Discover view listing MCP servers"
					loading="lazy"
				/>
				<div class="shot-caption">
					<div>Discover</div>
					<span>Registry browsing</span>
				</div>
			</div>
			<div class="shot has-image">
				<img
					class="shot-img"
					src="/screens/installed.png"
					alt="Installed view showing installed MCP servers for Cursor"
					loading="lazy"
				/>
				<div class="shot-caption">
					<div>Installed</div>
					<span>What’s set up</span>
				</div>
			</div>
			<div class="shot has-image">
				<img
					class="shot-img"
					src="/screens/install-modal.png"
					alt="Install dialog for a server showing target and install button"
					loading="lazy"
				/>
				<div class="shot-caption">
					<div>Install</div>
					<span>One-click flow</span>
				</div>
			</div>
			<div class="shot has-image">
				<img
					class="shot-img"
					src="/screens/search.png"
					alt="Discover view with search query and filtered results"
					loading="lazy"
				/>
				<div class="shot-caption">
					<div>Search</div>
					<span>Filter fast</span>
				</div>
			</div>
		</div>
	</div>
</section>

<section id="faq" class="section">
	<div class="container">
		<h2>FAQ</h2>

		<div class="faq">
			<details>
				<summary>Which editors are supported?</summary>
				<p>MCP Dock focuses on installs for Cursor, Claude Code, and VS Code.</p>
			</details>
			<details>
				<summary>Where do I get builds?</summary>
				<p>
					Grab the latest installer from
					<a href="https://github.com/reagent-systems/mcp-dock/releases">GitHub Releases</a>.
				</p>
			</details>
			<details>
				<summary>Can I contribute?</summary>
				<p>
					Yes — the project is on <a href="https://github.com/reagent-systems/mcp-dock">GitHub</a>.
					Issues and PRs are welcome.
				</p>
			</details>
		</div>
	</div>
</section>
