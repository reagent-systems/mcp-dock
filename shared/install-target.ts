import type { RegistryPackage, RegistryRemote, RegistryServer } from './registry.js'

function hasTemplate(url: string) {
  return /\{[^}]+\}/.test(url)
}

function norm(s: string | undefined): string {
  return (s ?? '').toLowerCase()
}

export function findStdioNpmPackage(server: RegistryServer): RegistryPackage | undefined {
  return server.packages?.find(p => norm(p.registryType) === 'npm' && norm(p.transport?.type) === 'stdio')
}

export function findStdioPypiPackage(server: RegistryServer): RegistryPackage | undefined {
  return server.packages?.find(p => norm(p.registryType) === 'pypi' && norm(p.transport?.type) === 'stdio')
}

export function normalizeRemoteTransportType(t: string): string {
  const lower = t.toLowerCase()
  if (lower === 'streamablehttp') return 'streamable-http'
  return t
}

export function findUsableRemote(server: RegistryServer): RegistryRemote | undefined {
  return server.remotes?.find((r) => {
    const t = normalizeRemoteTransportType(r.type).toLowerCase()
    return (t === 'streamable-http' || t === 'http' || t === 'sse') && r.url && !hasTemplate(r.url)
  })
}

function isOciOnly(server: RegistryServer): boolean {
  const pkgs = server.packages ?? []
  if (pkgs.length === 0) return false
  const stdioNpm = findStdioNpmPackage(server)
  const stdioPypi = findStdioPypiPackage(server)
  return pkgs.every(p => norm(p.registryType) === 'oci') && !stdioNpm && !stdioPypi
}

export type RegistryInstallTarget =
  | { ok: true; kind: 'npm'; pkg: RegistryPackage }
  | { ok: true; kind: 'pypi'; pkg: RegistryPackage }
  | { ok: true; kind: 'remote'; remote: RegistryRemote }
  | { ok: false; message: string }

/**
 * Whether MCP Dock can derive a Cursor/Claude/VS Code MCP entry from registry metadata alone
 * (before env vars or headers are filled in).
 */
export function resolveRegistryInstallTarget(server: RegistryServer): RegistryInstallTarget {
  if (isOciOnly(server)) {
    return {
      ok: false,
      message:
        'This listing only publishes an OCI container image. MCP Dock does not wire up OCI servers yet — run the image yourself or paste a manual config from the publisher’s docs.',
    }
  }

  const stdioNpm = findStdioNpmPackage(server)
  if (stdioNpm) return { ok: true, kind: 'npm', pkg: stdioNpm }

  const stdioPypi = findStdioPypiPackage(server)
  if (stdioPypi) return { ok: true, kind: 'pypi', pkg: stdioPypi }

  const remote = findUsableRemote(server)
  if (remote) return { ok: true, kind: 'remote', remote }

  if (server.remotes?.some(r => r.url && hasTemplate(r.url))) {
    return {
      ok: false,
      message:
        'Remote URLs in this listing use placeholders (for example {api_key} or {HOST}). MCP Dock needs a fixed URL, or you can edit the config after install.',
    }
  }

  const pkgs = server.packages ?? []
  const hasNpmOrPypiNonStdio = pkgs.some(
    p =>
      (norm(p.registryType) === 'npm' || norm(p.registryType) === 'pypi')
      && norm(p.transport?.type) !== 'stdio',
  )
  if (hasNpmOrPypiNonStdio) {
    return {
      ok: false,
      message:
        'This package is tied to remote HTTP transport in the registry, not a local npx/uvx command, and there is no concrete remote URL here for MCP Dock to use.',
    }
  }

  if (pkgs.length === 0 && !(server.remotes?.length)) {
    return {
      ok: false,
      message:
        'This listing does not include packages or remote URLs yet. Use the repository or website link to install, or try again if the publisher updates the registry entry.',
    }
  }

  return {
    ok: false,
    message:
      'No install path MCP Dock can use from this listing. It needs an npm or PyPI stdio package, or an HTTPS remote URL without template placeholders.',
  }
}

/** mcpservers.org directory rows are filled in at install time via the detail page. */
export function mayResolveViaMcpserversOrgEnrich(server: RegistryServer): boolean {
  return server.name.startsWith('mcpservers.org/servers/')
}

/** `github.com/owner/repo` stubs from HTML catalogs: README / package.json fetched at install time. */
export function parseGithubCatalogStubCoords(server: RegistryServer): { owner: string; repo: string } | null {
  const cleaned = server.name.replace(/\.git$/i, '').trim()
  const m = cleaned.match(/^github\.com\/([^/]+)\/([^/]+)$/i)
  if (m) return { owner: m[1], repo: m[2] }
  return null
}

function hasGithubRepositoryUrl(server: RegistryServer): boolean {
  if (!server.repository?.url) return false
  try {
    return new URL(server.repository.url).hostname.replace(/^www\./, '') === 'github.com'
  }
  catch {
    return false
  }
}

/**
 * README enrichment may fill in install hints. Prefer `github.com/o/r` catalog names; also allow a GitHub
 * `repository.url` when the row is not OCI-only (so OCI listings still show the real blocker).
 */
export function mayResolveViaGithubReadmeEnrich(server: RegistryServer): boolean {
  if (parseGithubCatalogStubCoords(server) !== null) return true
  if (!hasGithubRepositoryUrl(server)) return false
  if (isOciOnly(server)) return false
  return true
}

export function discoverInstallGate(server: RegistryServer): { allowed: boolean; blocker?: string } {
  if (mayResolveViaMcpserversOrgEnrich(server)) return { allowed: true }
  const r = resolveRegistryInstallTarget(server)
  if (r.ok) return { allowed: true }
  if (mayResolveViaGithubReadmeEnrich(server)) return { allowed: true }
  return { allowed: false, blocker: r.message }
}
