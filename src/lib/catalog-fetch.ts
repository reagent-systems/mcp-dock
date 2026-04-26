import type { CatalogExtraSource } from '../../shared/catalog.js'
import { catalogRowKey, normalizeToListItems } from '../../shared/catalog.js'
import { OFFICIAL_REGISTRY_SERVERS_URL } from '../../shared/official-registry.js'
import type { RegistryListItem, RegistryListResponse, RegistryServer } from '../../shared/registry.js'

const MAX_REGISTRY_PAGES = 40
const MCPSERVERS_FETCH_CONCURRENCY = 8

function isSameOfficialRegistryServersUrl(url: string): boolean {
  try {
    const a = new URL(url.trim())
    const b = new URL(OFFICIAL_REGISTRY_SERVERS_URL)
    return a.origin === b.origin && a.pathname.replace(/\/$/, '') === b.pathname.replace(/\/$/, '')
  }
  catch {
    return false
  }
}

async function fetchText(url: string): Promise<string> {
  if (typeof window !== 'undefined' && window.mcpDock?.fetchCatalogText)
    return window.mcpDock.fetchCatalogText(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.text()
}

function parseJsonFromText(text: string, url: string): unknown {
  try {
    return JSON.parse(text) as unknown
  }
  catch (e) {
    const head = text.trim().slice(0, 120)
    const looksHtml = head.startsWith('<!DOCTYPE') || head.startsWith('<html') || head.startsWith('<')
    const hint = looksHtml
      ? 'Expected JSON but got HTML. This URL looks like a web page, not a JSON/API endpoint.'
      : 'Expected JSON but could not parse the response.'
    throw new Error(`${hint} URL: ${url}. Response starts with: ${JSON.stringify(head)}`)
  }
}

export async function fetchRegistryAllPages(endpointUrl: string): Promise<RegistryListItem[]> {
  const out: RegistryListItem[] = []
  let cursor: string | undefined
  for (let i = 0; i < MAX_REGISTRY_PAGES; i++) {
    const u = new URL(endpointUrl)
    u.searchParams.set('limit', '100')
    if (cursor) u.searchParams.set('cursor', cursor)
    else u.searchParams.delete('cursor')
    const text = await fetchText(u.toString())
    const j = parseJsonFromText(text, u.toString()) as RegistryListResponse
    if (!Array.isArray(j.servers)) throw new Error('Invalid registry response (missing servers[])')
    out.push(...j.servers)
    cursor = j.metadata?.nextCursor
    if (!cursor) break
  }
  return out
}

export async function fetchJsonCatalog(url: string): Promise<RegistryListItem[]> {
  const text = await fetchText(url)
  const data: unknown = parseJsonFromText(text, url)
  return normalizeToListItems(data)
}

function parseGitHubMcpHtml(html: string): RegistryListItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
  const out: RegistryListItem[] = []
  const seen = new Set<string>()

  for (const a of anchors) {
    const href = a.getAttribute('href') ?? ''
    // Accept both absolute and relative links.
    const abs = href.startsWith('http') ? href : href.startsWith('/') ? `https://github.com${href}` : ''
    if (!abs) continue

    const m = abs.match(/^https:\/\/github\.com\/mcp\/([^/]+)\/([^/?#]+)/)
    if (!m) continue
    const org = m[1]
    const repo = m[2]
    const key = `${org}/${repo}`
    if (seen.has(key)) continue
    seen.add(key)

    const title = (a.textContent ?? '').trim() || `${org}/${repo}`
    const server: RegistryServer = {
      name: `github.com/mcp/${org}/${repo}`,
      title,
      version: '0.0.0',
      repository: { url: abs, source: 'github' },
    }
    out.push({ server })
  }

  return out
}

function parseAwesomeMcpServersReadme(md: string): RegistryListItem[] {
  // Extract GitHub repo links of the form https://github.com/<owner>/<repo>
  // This intentionally ignores anchor fragments and query params.
  const re = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[/?#][^\s)]*)?/g
  const out: RegistryListItem[] = []
  const seen = new Set<string>()

  for (const m of md.matchAll(re)) {
    const owner = m[1]
    const repo = m[2]
    const key = `${owner}/${repo}`
    if (key.toLowerCase() === 'punkpeye/awesome-mcp-servers') continue
    if (seen.has(key)) continue
    seen.add(key)

    const url = `https://github.com/${owner}/${repo}`
    const server: RegistryServer = {
      name: `github.com/${owner}/${repo}`,
      title: key,
      version: '0.0.0',
      repository: { url, source: 'github' },
    }
    out.push({ server })
  }

  return out
}

async function fetchGitHubReadmeMarkdown(owner: string, repo: string): Promise<string> {
  // Try common default branches. (We avoid the GitHub API to keep this simple.)
  const branches = ['main', 'master']
  for (const br of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${br}/README.md`
    try {
      const text = await fetchText(rawUrl)
      if (text.length) return text
    }
    catch {
      continue
    }
  }
  throw new Error(`Could not fetch README.md from ${owner}/${repo}`)
}

function isMcpserversHost(hostname: string): boolean {
  const h = hostname.replace(/^www\./, '')
  return h === 'mcpservers.org'
}

function normalizeMcpserversSeedUrl(u: URL): string {
  const out = new URL(u.toString())
  if (!isMcpserversHost(out.hostname)) return u.toString()
  const path = out.pathname.replace(/\/$/, '') || '/'
  if (path === '/' || path === '') out.pathname = '/all'
  if (!out.searchParams.has('sort')) out.searchParams.set('sort', 'name')
  if (!out.searchParams.has('page')) out.searchParams.set('page', '1')
  return out.toString()
}

function inferPerPageFromShowingLine(html: string): number | null {
  const m = html.match(/Showing\s+(\d+)\s*-\s*(\d+)\s+of\s+\d+/i)
  if (!m) return null
  return parseInt(m[2], 10) - parseInt(m[1], 10) + 1
}

function inferMaxPageNumber(html: string): number {
  const m = html.match(/Showing\s+\d+\s*-\s*\d+\s+of\s+(\d+)\s+servers/i)
  if (m) {
    const total = parseInt(m[1], 10)
    const per = inferPerPageFromShowingLine(html) ?? 30
    return Math.max(1, Math.ceil(total / per))
  }
  let max = 1
  for (const x of html.matchAll(/[?&]page=(\d+)/g)) {
    const n = parseInt(x[1], 10)
    if (n > max) max = n
  }
  return max
}

function mcpserversAnchorToServer(websiteUrl: string, title: string, description: string): RegistryServer {
  const u = new URL(websiteUrl)
  const desc = description.replace(/\s+/g, ' ').trim()

  if (u.hostname === 'github.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2) {
      const owner = parts[0]
      const repo = parts[1]
      return {
        name: `github.com/${owner}/${repo}`,
        title,
        description: desc || undefined,
        version: '0.0.0',
        websiteUrl: websiteUrl,
        repository: { url: `https://github.com/${owner}/${repo}`, source: 'github' },
      }
    }
  }

  const host = u.hostname.replace(/^www\./, '')
  const path = u.pathname.replace(/\/$/, '')
  if (host === 'mcpservers.org') {
    const name = `mcpservers.org${path}` || 'mcpservers.org'
    return {
      name,
      title,
      description: desc || undefined,
      version: '0.0.0',
      websiteUrl: websiteUrl,
    }
  }

  const name = `${host}${path}` || host
  return {
    name: `mcpservers.org-site:${name}`,
    title,
    description: desc || undefined,
    version: '0.0.0',
    websiteUrl: websiteUrl,
  }
}

export function parseMcpserversOrgListHtml(html: string, origin: string): RegistryListItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: RegistryListItem[] = []
  const seen = new Set<string>()

  for (const a of doc.querySelectorAll('main a.block[href]')) {
    const href = a.getAttribute('href')?.trim() ?? ''
    if (!href || href.startsWith('#')) continue

    const titleEl = a.querySelector('.text-lg.font-semibold')
    const title = (titleEl?.textContent ?? '').trim()
    if (!title) continue

    const descEl = a.querySelector('.text-sm.text-gray-600')
    const description = (descEl?.textContent ?? '').trim()

    let abs: URL
    try {
      abs = new URL(href, origin)
    }
    catch {
      continue
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue

    const server = mcpserversAnchorToServer(abs.toString(), title, description)
    const key = catalogRowKey({ server })
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ server })
  }

  return out
}

async function fetchMcpserversOrgCatalog(seedUrl: string): Promise<RegistryListItem[]> {
  const u = new URL(seedUrl)
  const normalized = normalizeMcpserversSeedUrl(u)
  const origin = new URL(normalized).origin

  const firstHtml = await fetchText(normalized)
  const maxPage = inferMaxPageNumber(firstHtml)
  const seen = new Set<string>()
  const all: RegistryListItem[] = []

  const addRows = (rows: RegistryListItem[]) => {
    for (const row of rows) {
      const k = catalogRowKey(row)
      if (seen.has(k)) continue
      seen.add(k)
      all.push(row)
    }
  }

  addRows(parseMcpserversOrgListHtml(firstHtml, origin))

  const pageNumbers: number[] = []
  for (let p = 2; p <= maxPage; p++) pageNumbers.push(p)

  for (let i = 0; i < pageNumbers.length; i += MCPSERVERS_FETCH_CONCURRENCY) {
    const chunk = pageNumbers.slice(i, i + MCPSERVERS_FETCH_CONCURRENCY)
    const htmls = await Promise.all(
      chunk.map((p) => {
        const next = new URL(normalized)
        next.searchParams.set('page', String(p))
        return fetchText(next.toString())
      }),
    )
    for (const h of htmls) addRows(parseMcpserversOrgListHtml(h, origin))
  }

  return all
}

export async function fetchHtmlCatalog(url: string): Promise<RegistryListItem[]> {
  let u: URL
  try {
    u = new URL(url)
  }
  catch {
    u = new URL('https://invalid.local/')
  }

  if (isMcpserversHost(u.hostname)) return fetchMcpserversOrgCatalog(url)

  try {
    if (u.hostname === 'github.com') {
      const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)

      // https://github.com/mcp (org page)
      if (parts.length === 1 && parts[0] === 'mcp') {
        const html = await fetchText(url)
        const rows = parseGitHubMcpHtml(html)
        if (rows.length === 0) throw new Error('No MCP repos found on page')
        return rows
      }

      // https://github.com/punkpeye/awesome-mcp-servers (README-driven list)
      if (parts.length === 2 && parts[0] === 'punkpeye' && parts[1] === 'awesome-mcp-servers') {
        const md = await fetchGitHubReadmeMarkdown('punkpeye', 'awesome-mcp-servers')
        const rows = parseAwesomeMcpServersReadme(md)
        if (rows.length === 0) throw new Error('No GitHub repo links found in README.md')
        return rows
      }
    }
  }
  catch {
    // ignore URL parse errors
  }

  const html = await fetchText(url)

  // Generic fallback: extract GitHub MCP repo links if present anywhere.
  const generic = parseGitHubMcpHtml(html)
  if (generic.length > 0) return generic

  const head = html.trim().slice(0, 120)
  throw new Error(`HTML catalog parser found no entries. Response starts with: ${JSON.stringify(head)}`)
}

export type ExtraCatalogResult =
  | { label: string; rows: RegistryListItem[] }
  | { label: string; error: string }

export async function fetchExtraCatalogs(sources: CatalogExtraSource[]): Promise<ExtraCatalogResult[]> {
  const enabled = sources.filter((s) => s.url.trim().length > 0 && s.label.trim().length > 0)
  return Promise.all(
    enabled.map(async (s): Promise<ExtraCatalogResult> => {
      const label = s.label.trim()
      try {
        if (s.kind === 'registry' && isSameOfficialRegistryServersUrl(s.url)) {
          return { label, rows: [] }
        }
        const rows = await (async () => {
          if (s.kind === 'registry') return fetchRegistryAllPages(s.url.trim())
          if (s.kind === 'json') return fetchJsonCatalog(s.url.trim())
          return fetchHtmlCatalog(s.url.trim())
        })()
        return { label, rows }
      }
      catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { label, error: msg }
      }
    }),
  )
}
