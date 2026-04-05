import type { RegistryListResponse } from '../../shared/registry.js'

const BASE = 'https://registry.modelcontextprotocol.io/v0/servers'

export async function fetchRegistryPage(cursor?: string): Promise<RegistryListResponse> {
  const u = new URL(BASE)
  u.searchParams.set('limit', '100')
  if (cursor) u.searchParams.set('cursor', cursor)
  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`Registry error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<RegistryListResponse>
}
