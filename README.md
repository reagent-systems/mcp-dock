# MCP Dock

Browse the MCP Registry and install servers into **Cursor**, **Claude Code**, and **VS Code**.

- Desktop app: Electron + Vite + React (source in `src/` + `electron/`)
- Website: SvelteKit workspace (source in `website/`)

## Features

- Browse MCP servers and view their metadata
- Install server configs into supported clients (Cursor / Claude Desktop / VS Code)
- Packaged releases for macOS + Windows

## Requirements

- Node.js 18+ (20+ recommended)
- npm

## Getting started

Install dependencies:

```sh
npm install
```

Run the desktop app in dev mode:

```sh
npm run dev
```

Run the website in dev mode:

```sh
npm run dev:website
```

## Build

Desktop app (packages into `release/<version>/`):

```sh
npm run build
```

Website:

```sh
npm run build:website
```

## Release artifacts

By default, Electron Builder outputs to `release/${version}/` (see `electron-builder.json`).

- Windows (NSIS installer): `release/<version>/MCP-Dock_<version>.exe`
- Windows (unpacked): `release/<version>/win-unpacked/`
- macOS: `release/<version>/MCP-Dock_<version>.dmg` and `.zip`
- Linux: `release/<version>/MCP-Dock_<version>.tar.gz`

### Signatures

- macOS signing + notarization: `npm run release:mac`
- Windows Authenticode + Linux checksum/GPG signing (CI): see `docs/signing.md`

### Windows build (from macOS or Windows)

```sh
npm run build -- --win --x64
```

### Signed + notarized macOS build

This repo includes `scripts/release-mac.sh` which runs a signed + notarized macOS build.

```sh
npm run release:mac
```

The script expects code-signing and notarization environment variables (see the top of `scripts/release-mac.sh`).

## Repository layout

```text
electron/            Electron main + preload source
src/                 Renderer (React) source
public/              Static assets for the desktop app
dist/                Renderer production build output
dist-electron/        Electron production build output
release/             Packaged installers and unpacked apps (by version)
website/             SvelteKit marketing site (npm workspace)
```

## Testing

```sh
npm test
```

## License

MIT — see `LICENSE`.
