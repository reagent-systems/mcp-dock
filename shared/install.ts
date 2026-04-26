import type { RegistryListItem, RegistryPackage, RegistryServer } from './registry.js'

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

function hasTemplate(url: string) {
  return /\{[^}]+\}/.test(url)
}

export function listRequiredInputs(server: RegistryServer) {
  const pkgs = server.packages ?? []
  const stdioNpm = pkgs.find(p => p.registryType === 'npm' && p.transport?.type === 'stdio')
  const stdioPypi = pkgs.find(p => p.registryType === 'pypi' && p.transport?.type === 'stdio')
  const pkg: RegistryPackage | undefined = stdioNpm ?? stdioPypi
  const env = [...(pkg?.environmentVariables ?? [])]
  const remote = server.remotes?.find((r) => {
    const t = r.type === 'streamableHttp' ? 'streamable-http' : r.type
    return (t === 'streamable-http' || t === 'http' || t === 'sse') && r.url && !hasTemplate(r.url)
  })
  const headers = remote?.headers ?? []
  return { env, headers }
}
