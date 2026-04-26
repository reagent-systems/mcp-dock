import type {
  RegistryEnvVar,
  RegistryPackage,
  RegistryRemote,
  RegistryRemoteHeader,
  RegistryServer,
} from '../../shared/registry.js'
import { fetchCatalogTextFromNetwork } from './catalog-net.js'

function hasTemplateUrl(url: string) {
  return /\{[^}]+\}/.test(url) || /\$\{/.test(url)
}

export function normalizeRegistryRemoteType(t: string): string {
  const lower = t.toLowerCase()
  if (lower === 'streamablehttp') return 'streamable-http'
  return t
}

export function isMcpserversOrgListing(server: RegistryServer): boolean {
  if (server.name.startsWith('mcpservers.org/servers/')) return true
  try {
    const u = new URL(server.websiteUrl ?? '')
    return u.hostname.replace(/^www\./, '') === 'mcpservers.org' && u.pathname.includes('/servers/')
  }
  catch {
    return false
  }
}

export function mcpserversDetailPageUrl(server: RegistryServer): string | null {
  if (server.websiteUrl) {
    try {
      const u = new URL(server.websiteUrl)
      if (u.hostname.replace(/^www\./, '') === 'mcpservers.org' && u.pathname.includes('/servers/'))
        return `${u.origin}${u.pathname}`.replace(/\/$/, '')
    }
    catch { /* fall through */ }
  }
  const m = server.name.match(/^mcpservers\.org(\/servers\/.+)$/i)
  if (m) return `https://mcpservers.org${m[1].replace(/\/$/, '')}`
  return null
}

/** Decode common entities so JSON-ish snippets in HTML match our regexes. */
export function normalizeMcpserversHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\\"/g, '"')
}

function extractHeadersNearUrl(html: string, url: string): RegistryRemoteHeader[] | undefined {
  const idx = html.indexOf(url)
  if (idx === -1) return undefined
  const slice = html.slice(Math.max(0, idx - 250), Math.min(html.length, idx + 1100))
  const block = slice.match(/"headers"\s*:\s*\{([^}]*)\}/)
  if (!block) return undefined
  const inner = block[1]
  const headers: RegistryRemoteHeader[] = []
  for (const m of inner.matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g)) {
    const name = m[1]
    const val = m[2]
    const placeholder = /YOUR_|REPLACE|PLACEHOLDER|xxx|^Bearer\s*$/i.test(val)
    headers.push({
      name,
      isRequired: placeholder || /authorization|api-key|x-api-key|bearer/i.test(name),
      isSecret: /authorization|secret|password|token|api-key|x-api-key/i.test(name),
    })
  }
  return headers.length ? headers : undefined
}

function parseEnvObjectInner(inner: string): RegistryEnvVar[] {
  const env: RegistryEnvVar[] = []
  for (const m of inner.matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g)) {
    const name = m[1]
    const val = m[2]
    const placeholder = /\$\{|YOUR_|REPLACE|PLACEHOLDER|xxx|^fc-[A-Z_]+$/i.test(val)
    env.push({
      name,
      isRequired: placeholder,
      isSecret: /key|secret|password|token|auth/i.test(name),
      ...(placeholder ? {} : { default: val }),
    })
  }
  return env
}

function extractEnvNearIndex(html: string, idx: number): RegistryEnvVar[] | undefined {
  const slice = html.slice(Math.max(0, idx - 400), Math.min(html.length, idx + 900))
  const block = slice.match(/"env"\s*:\s*\{([\s\S]*?)\}\s*[,}]/)
  if (!block) return undefined
  const vars = parseEnvObjectInner(block[1])
  return vars.length ? vars : undefined
}

function isNoiseMcpUrl(url: string): boolean {
  return (
    /mcpservers\.org\/api\/og|mcp\.so\/playground|\/playground\?|github\.com\/[^/]+\/[^/]+\/(blob|raw)\/|\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(
      url,
    )
    || /vscode\.dev\/redirect/i.test(url)
    || /chromewebstore\.google\.com/i.test(url)
  )
}

/**
 * Many vendors expose a marketing page at `https://vendor.com/mcp` (HTML, POST 405) while the real
 * gateway is `https://mcp.vendor.com/mcp`. Drop the apex/www bare `/mcp` URL when the matching
 * `mcp.*` host is also present.
 */
function dropApexBareMcpWhenMcpSubdomainExists(remotes: RegistryRemote[]): RegistryRemote[] {
  const drop = new Set<string>()
  for (const r of remotes) {
    try {
      const u = new URL(r.url)
      const path = (u.pathname.replace(/\/$/, '') || '/').toLowerCase()
      if (path !== '/mcp') continue
      const host = u.hostname.toLowerCase()
      if (host.startsWith('mcp.')) continue
      const apexish = host.replace(/^www\./, '')
      const parts = apexish.split('.')
      if (parts.length !== 2) continue
      const mcpHost = `mcp.${apexish}`
      const hasSub = remotes.some((o) => {
        if (o.url === r.url) return false
        try {
          const v = new URL(o.url)
          if (v.hostname.toLowerCase() !== mcpHost) return false
          const p2 = (v.pathname.replace(/\/$/, '') || '/').toLowerCase()
          return p2 === '/mcp'
        }
        catch {
          return false
        }
      })
      if (hasSub) drop.add(r.url)
    }
    catch {
      continue
    }
  }
  return remotes.filter(r => !drop.has(r.url))
}

function sweepRemoteMcpUrls(html: string): RegistryRemote[] {
  const out: RegistryRemote[] = []
  const re =
    /https:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](?:\.[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9])*(?::[0-9]+)?(?:\/[^"'\\\s<>)\]]*)?/g
  for (const m of html.matchAll(re)) {
    let url = m[0].replace(/[),.;'"\]]+$/g, '')
    if (hasTemplateUrl(url)) continue
    if (isNoiseMcpUrl(url)) continue
    const path = (() => {
      try {
        return new URL(url).pathname
      }
      catch {
        return ''
      }
    })()
    const looksMcp =
      /\/(api\/)?mcp\b/i.test(path)
      || /\/sse\b/i.test(path)
      || /\/mcp\/v\d/i.test(path)
    if (!looksMcp) continue
    const type = /\/sse(\/|$|\?)/i.test(path) ? 'sse' : 'streamable-http'
    try {
      new URL(url)
      out.push({ type, url, headers: extractHeadersNearUrl(html, url) })
    }
    catch {
      continue
    }
  }
  return out
}

/**
 * Pull streamable-http / SSE URLs and optional header defs from mcpservers.org server detail HTML.
 */
export function extractRemotesFromMcpserversDetailHtml(html: string): RegistryRemote[] {
  const candidates: RegistryRemote[] = []

  for (const m of html.matchAll(
    /"type"\s*:\s*"(streamableHttp|streamable-http|http|sse)"\s*,\s*"url"\s*:\s*"(https:\/\/[^"]+)"/gi,
  )) {
    candidates.push({
      type: normalizeRegistryRemoteType(m[1]),
      url: m[2],
      headers: extractHeadersNearUrl(html, m[2]),
    })
  }

  for (const m of html.matchAll(
    /"url"\s*:\s*"(https:\/\/[^"]+)"\s*,\s*"type"\s*:\s*"(streamableHttp|streamable-http|http|sse)"/gi,
  )) {
    candidates.push({
      type: normalizeRegistryRemoteType(m[2]),
      url: m[1],
      headers: extractHeadersNearUrl(html, m[1]),
    })
  }

  for (const m of html.matchAll(/href="(https:\/\/[^"]+\/api\/mcp[^"]*)"/gi)) {
    candidates.push({ type: 'streamable-http', url: m[1] })
  }

  for (const m of html.matchAll(/\b(https:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[^\s<"'{}]*\/api\/mcp)\b/gi)) {
    candidates.push({ type: 'streamable-http', url: m[1] })
  }

  for (const m of html.matchAll(/href="(https:\/\/[^"]+)"/gi)) {
    const url = m[1]
    if (!/\/mcp$/i.test(url)) continue
    if (/\/mcp-server$/i.test(url)) continue
    candidates.push({ type: 'streamable-http', url })
  }

  candidates.push(...sweepRemoteMcpUrls(html))

  const seen = new Set<string>()
  const out: RegistryRemote[] = []
  for (const r of candidates) {
    if (!r.url || hasTemplateUrl(r.url)) continue
    try {
      const u = new URL(r.url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    }
    catch {
      continue
    }
    if (seen.has(r.url)) continue
    seen.add(r.url)
    out.push({
      type: normalizeRegistryRemoteType(r.type),
      url: r.url,
      ...(r.headers?.length ? { headers: r.headers } : {}),
    })
  }
  return dropApexBareMcpWhenMcpSubdomainExists(out)
}

function isSkippableNpxTail(html: string, endIdx: number): boolean {
  const tail = html.slice(endIdx, endIdx + 40).trimStart()
  if (/^install\s+/i.test(tail)) return true
  return false
}

/**
 * Extract npm stdio packages from common mcpservers.org documentation patterns.
 */
export function extractNpmStdioPackagesFromMcpserversDetailHtml(html: string): RegistryPackage[] {
  const packages: RegistryPackage[] = []
  const seen = new Set<string>()

  const pushPkg = (identifier: string, version: string, envIdx: number) => {
    const id = identifier.trim()
    if (!id || id.length > 200) return
    if (/^(cli|sh|bash)$/i.test(id)) return
    if (seen.has(id)) return
    seen.add(id)
    packages.push({
      registryType: 'npm',
      identifier: id,
      version: version || 'latest',
      transport: { type: 'stdio' },
      ...(envIdx >= 0 ? { environmentVariables: extractEnvNearIndex(html, envIdx) } : {}),
    })
  }

  for (const m of html.matchAll(/"args"\s*:\s*\[\s*"-y"\s*,\s*"([^"]+)"\s*\]/gi)) {
    const id = m[1]
    if (id.includes('${')) continue
    pushPkg(id, 'latest', m.index ?? 0)
  }

  for (const m of html.matchAll(
    /\bnpx\s+-y\s+(@?[\w.-]+\/[\w.-]+|[@a-zA-Z][\w.-]*)(?:@([\w.-]+))?\b/gi,
  )) {
    if (isSkippableNpxTail(html, m.index! + m[0].length)) continue
    const lineStart = html.lastIndexOf('\n', m.index!)
    const line = html.slice(lineStart + 1, (m.index ?? 0) + 80)
    if (/\bsmithery\b/i.test(line) && /\binstall\b/i.test(line)) continue
    pushPkg(m[1], m[2] ?? 'latest', m.index ?? 0)
  }

  for (const m of html.matchAll(/npx%22%2C%22args%22%3A%5B%22-y%22%2C%22([^"%]+)/gi)) {
    try {
      const id = decodeURIComponent(m[1])
      pushPkg(id, 'latest', m.index ?? 0)
    }
    catch {
      continue
    }
  }

  return packages
}

export function extractPypiStdioPackagesFromMcpserversDetailHtml(html: string): RegistryPackage[] {
  const packages: RegistryPackage[] = []
  const seen = new Set<string>()

  for (const m of html.matchAll(/\buvx\s+([a-zA-Z0-9][a-zA-Z0-9_-]*)(?:==([\w.]+))?\b/g)) {
    const id = m[1]
    const ver = m[2] ?? 'latest'
    if (seen.has(id)) continue
    seen.add(id)
    packages.push({
      registryType: 'pypi',
      identifier: id,
      version: ver,
      transport: { type: 'stdio' },
    })
  }

  return packages
}

export function registryServerHasConcreteHttpRemote(server: RegistryServer): boolean {
  return !!server.remotes?.some((r) => {
    if (!r.url || hasTemplateUrl(r.url)) return false
    const t = normalizeRegistryRemoteType(r.type)
    return t === 'streamable-http' || t === 'http' || t === 'sse'
  })
}

export async function enrichMcpserversOrgServerIfNeeded(server: RegistryServer): Promise<RegistryServer> {
  if (!isMcpserversOrgListing(server)) return server
  if (server.packages?.length) return server
  if (registryServerHasConcreteHttpRemote(server)) return server

  const detailUrl = mcpserversDetailPageUrl(server)
  if (!detailUrl) return server

  try {
    const raw = await fetchCatalogTextFromNetwork(detailUrl)
    const html = normalizeMcpserversHtml(raw)

    const remotes = extractRemotesFromMcpserversDetailHtml(html)
    const npmPkgs = extractNpmStdioPackagesFromMcpserversDetailHtml(html)
    const pypiPkgs = extractPypiStdioPackagesFromMcpserversDetailHtml(html)
    const packages = [...npmPkgs, ...pypiPkgs]

    if (remotes.length === 0 && packages.length === 0) return server

    const next: RegistryServer = { ...server }
    if (remotes.length > 0) next.remotes = remotes
    if (packages.length > 0) next.packages = packages
    return next
  }
  catch {
    return server
  }
}
