import type { CatalogExtraSource } from '../../shared/catalog.js'
import { normalizeToListItems } from '../../shared/catalog.js'
import type { RegistryListItem, RegistryListResponse } from '../../shared/registry.js'

const MAX_REGISTRY_PAGES = 40

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
    const j = (await res.json()) as RegistryListResponse
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
  const data: unknown = await res.json()
  return normalizeToListItems(data)
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
        const rows =
          s.kind === 'registry'
            ? await fetchRegistryAllPages(s.url.trim())
            : await fetchJsonCatalog(s.url.trim())
        return { label, rows }
      }
      catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { label, error: msg }
      }
    }),
  )
}
