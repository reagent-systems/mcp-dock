import type { CatalogExtraSource } from '../../shared/catalog.js'
import { normalizeToListItems } from '../../shared/catalog.js'
import type { RegistryListItem, RegistryListResponse, RegistryServer } from '../../shared/registry.js'

const MAX_REGISTRY_PAGES = 40

async function readJsonOrExplain(res: Response, url: string): Promise<unknown> {
  const ct = res.headers.get('content-type') ?? ''
  const text = await res.text()
  try {
    return JSON.parse(text) as unknown
  }
  catch (e) {
    const head = text.trim().slice(0, 120)
    const looksHtml = head.startsWith('<!DOCTYPE') || head.startsWith('<html') || head.startsWith('<')
    const hint = looksHtml
      ? 'Expected JSON but got HTML. This URL looks like a web page, not a JSON/API endpoint.'
      : 'Expected JSON but could not parse the response.'
    const ctPart = ct ? ` (content-type: ${ct})` : ''
    throw new Error(`${hint}${ctPart} URL: ${url}. Response starts with: ${JSON.stringify(head)}`)
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
    const res = await fetch(u.toString())
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const j = (await readJsonOrExplain(res, u.toString())) as RegistryListResponse
    if (!Array.isArray(j.servers)) throw new Error('Invalid registry response (missing servers[])')
    out.push(...j.servers)
    cursor = j.metadata?.nextCursor
    if (!cursor) break
  }
  return out
}

export async function fetchJsonCatalog(url: string): Promise<RegistryListItem[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await readJsonOrExplain(res, url)
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
    const res = await fetch(rawUrl)
    if (!res.ok) continue
    return await res.text()
  }
  throw new Error(`Could not fetch README.md from ${owner}/${repo}`)
}

export async function fetchHtmlCatalog(url: string): Promise<RegistryListItem[]> {
  try {
    const u = new URL(url)
    if (u.hostname === 'github.com') {
      const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)

      // https://github.com/mcp (org page)
      if (parts.length === 1 && parts[0] === 'mcp') {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const html = await res.text()
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

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

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
