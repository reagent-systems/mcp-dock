import type { RegistryPackage, RegistryRemote, RegistryServer } from '../../shared/registry.js'
import { extractMcpServersStdioFromMarkdown } from '../../shared/mcp-readme-config.js'
import { parseGithubCatalogStubCoords } from '../../shared/install-target.js'
import {
  extractNpmStdioPackagesFromMcpserversDetailHtml,
  extractPypiStdioPackagesFromMcpserversDetailHtml,
  extractRemotesFromMcpserversDetailHtml,
  normalizeMcpserversHtml,
  registryServerHasConcreteHttpRemote,
} from './mcpservers-enrich.js'

const UA = 'MCP-Dock/electron (https://github.com/reagent-systems/mcp-dock)'

/** GitHub coordinates from `github.com/o/r` catalog name or `repository.url`. */
export function parseGithubCoordsForEnrich(server: RegistryServer): { owner: string; repo: string } | null {
  const fromName = parseGithubCatalogStubCoords(server)
  if (fromName) return fromName
  if (!server.repository?.url) return null
  try {
    const u = new URL(server.repository.url)
    if (u.hostname.replace(/^www\./, '') !== 'github.com') return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, '') }
  }
  catch {
    return null
  }
}

async function fetchDefaultBranch(owner: string, repo: string): Promise<string | undefined> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': UA,
      },
    },
  )
  if (!res.ok) return undefined
  const j = (await res.json()) as { default_branch?: string }
  return typeof j.default_branch === 'string' ? j.default_branch : undefined
}

async function fetchRawReadme(owner: string, repo: string, branch: string): Promise<string | undefined> {
  for (const path of ['README.md', 'readme.md', 'Readme.md']) {
    const url =
      `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/`
      + `${encodeURIComponent(branch)}/${path}`
    const res = await fetch(url, {
      headers: { Accept: 'text/plain,*/*', 'User-Agent': UA },
    })
    if (res.ok) return await res.text()
  }
  return undefined
}

async function tryPackageJsonNpmStdio(
  owner: string,
  repo: string,
  branch: string,
): Promise<RegistryPackage[] | undefined> {
  const url =
    `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/`
    + `${encodeURIComponent(branch)}/package.json`
  const res = await fetch(url, {
    headers: { Accept: 'application/json,*/*', 'User-Agent': UA },
  })
  if (!res.ok) return undefined
  let j: unknown
  try {
    j = JSON.parse(await res.text())
  }
  catch {
    return undefined
  }
  if (!j || typeof j !== 'object') return undefined
  const name = (j as { name?: unknown }).name
  const version = (j as { version?: unknown }).version
  if (typeof name !== 'string' || !name.trim()) return undefined
  const ver = typeof version === 'string' && version.trim() ? version.trim() : 'latest'
  return [
    {
      registryType: 'npm',
      identifier: name.trim(),
      version: ver,
      transport: { type: 'stdio' },
    },
  ]
}

/** Apply README / package.json hints (for tests and reuse). */
export function mergeGithubInstallDocIntoServer(server: RegistryServer, rawDoc: string): RegistryServer {
  const normalized = normalizeMcpserversHtml(rawDoc)
  const remotes = extractRemotesFromMcpserversDetailHtml(normalized)
  const packages = [
    ...extractNpmStdioPackagesFromMcpserversDetailHtml(normalized),
    ...extractPypiStdioPackagesFromMcpserversDetailHtml(normalized),
  ]
  const stdioHint = extractMcpServersStdioFromMarkdown(rawDoc)
  if (remotes.length === 0 && packages.length === 0 && !stdioHint) return server
  const next: RegistryServer = { ...server }
  if (remotes.length > 0) next.remotes = remotes
  if (packages.length > 0) next.packages = packages
  if (stdioHint && packages.length === 0 && remotes.length === 0) next.mcpDockStdioHint = stdioHint
  return next
}

export async function enrichGithubReadmeServerIfNeeded(server: RegistryServer): Promise<RegistryServer> {
  const coords = parseGithubCoordsForEnrich(server)
  if (!coords) return server
  if (server.packages?.length) return server
  if (registryServerHasConcreteHttpRemote(server)) return server

  try {
    const def = await fetchDefaultBranch(coords.owner, coords.repo)
    const branches = [...new Set([def, 'main', 'master'].filter((b): b is string => !!b))]

    let remotes: RegistryRemote[] = []
    let packages: RegistryPackage[] = []

    let stdioHint: RegistryServer['mcpDockStdioHint']

    for (const b of branches) {
      const doc = await fetchRawReadme(coords.owner, coords.repo, b)
      if (!doc) continue
      const merged = mergeGithubInstallDocIntoServer(server, doc)
      remotes = merged.remotes ?? []
      packages = merged.packages ?? []
      stdioHint = merged.mcpDockStdioHint
      if (remotes.length > 0 || packages.length > 0 || stdioHint) break
    }

    if (remotes.length === 0 && packages.length === 0 && !stdioHint) {
      for (const b of branches) {
        const fromPkg = await tryPackageJsonNpmStdio(coords.owner, coords.repo, b)
        if (fromPkg?.length) {
          packages = fromPkg
          break
        }
      }
    }

    if (remotes.length === 0 && packages.length === 0 && !stdioHint) return server

    const next: RegistryServer = { ...server }
    if (remotes.length > 0) next.remotes = remotes
    if (packages.length > 0) next.packages = packages
    if (stdioHint && packages.length === 0 && remotes.length === 0) next.mcpDockStdioHint = stdioHint
    return next
  }
  catch {
    return server
  }
}
