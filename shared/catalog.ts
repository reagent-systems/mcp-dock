import type { RegistryListItem, RegistryServer } from './registry.js'

/** User-configured supplemental catalog (registry API or JSON bundle). */
export interface CatalogExtraSource {
  id: string
  label: string
  /** Full URL to `.../v0/servers` (or compatible) for kind `registry`, or a JSON document for `json`. */
  url: string
  kind: 'registry' | 'json' | 'html'
}

export function catalogRowKey(row: RegistryListItem): string {
  return `${row.server.name}@${row.server.version}`
}

/** Accept MCP list responses or a bare array of `{ server }` or server-shaped objects. */
export function normalizeToListItems(data: unknown): RegistryListItem[] {
  if (Array.isArray(data)) return normalizeArray(data)
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  const raw = obj.servers ?? obj.entries ?? obj.items
  if (!Array.isArray(raw)) return []
  return normalizeArray(raw)
}

function normalizeArray(raw: unknown[]): RegistryListItem[] {
  const out: RegistryListItem[] = []
  for (const item of raw) {
    if (item && typeof item === 'object' && 'server' in item) {
      const s = (item as RegistryListItem).server
      if (s?.name && s?.version) out.push(item as RegistryListItem)
      continue
    }
    if (item && typeof item === 'object' && 'name' in item && 'version' in item) {
      out.push({ server: item as RegistryServer })
    }
  }
  return out
}

/** Dedupe by name@version; official rows win; extras only fill gaps. */
export function mergeOfficialAndExtras(
  official: RegistryListItem[],
  extras: { label: string; rows: RegistryListItem[] }[],
): RegistryListItem[] {
  const map = new Map<string, RegistryListItem>()
  for (const r of official) {
    map.set(catalogRowKey(r), { ...r, _catalogLabel: undefined })
  }
  for (const { label, rows } of extras) {
    for (const r of rows) {
      const k = catalogRowKey(r)
      if (map.has(k)) continue
      map.set(k, { ...r, _catalogLabel: label })
    }
  }
  return [...map.values()]
}
