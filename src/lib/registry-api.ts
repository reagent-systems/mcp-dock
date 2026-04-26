import {
  OFFICIAL_REGISTRY_SERVERS_URL,
  REGISTRY_SERVERS_PAGE_SIZE,
} from '../../shared/official-registry.js'
import type { RegistryListResponse } from '../../shared/registry.js'

const BASE = OFFICIAL_REGISTRY_SERVERS_URL

export async function fetchRegistryPage(cursor?: string): Promise<RegistryListResponse> {
  const u = new URL(BASE)
  u.searchParams.set('limit', String(REGISTRY_SERVERS_PAGE_SIZE))
  if (cursor) u.searchParams.set('cursor', cursor)
  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`Registry error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RegistryListResponse>
}
