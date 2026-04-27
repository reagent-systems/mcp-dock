import type { RegistryListItem, RegistryServer } from './registry.js'

export function catalogRowKey(row: RegistryListItem): string {
  return `${row.server.name}@${row.server.version}`
}
