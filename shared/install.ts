import type { RegistryListItem, RegistryServer } from './registry.js'
import { resolveRegistryInstallTarget } from './install-target.js'

export function filterLatestOnly(items: RegistryListItem[]): RegistryListItem[] {
  return items.filter((item) => {
    const meta = item._meta?.['io.modelcontextprotocol.registry/official']
    if (meta && typeof meta.isLatest === 'boolean') return meta.isLatest
    return true
  })
}

export function suggestServerKey(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'mcp-server'
}

export function listRequiredInputs(server: RegistryServer) {
  const target = resolveRegistryInstallTarget(server)
  if (!target.ok) return { env: [], headers: [] }
  if (target.kind === 'npm' || target.kind === 'pypi') {
    const pkg = target.pkg
    return { env: [...(pkg.environmentVariables ?? [])], headers: [] }
  }
  const headers = target.remote.headers ?? []
  return { env: [], headers }
}
