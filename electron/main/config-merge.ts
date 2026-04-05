/**
 * Pure JSON merge helpers for MCP client configs (testable without Electron).
 */

export function mergeMcpServersMap(
  existing: Record<string, unknown>,
  key: string,
  entry: Record<string, unknown>,
  mapKey: 'mcpServers' | 'servers',
): Record<string, unknown> {
  const root = { ...existing }
  const prev = (root[mapKey] as Record<string, unknown> | undefined) ?? {}
  if (Object.prototype.hasOwnProperty.call(prev, key))
    throw new Error(`A server named "${key}" already exists in this config.`)
  root[mapKey] = { ...prev, [key]: entry }
  return root
}

export function removeFromMap(
  existing: Record<string, unknown>,
  key: string,
  mapKey: 'mcpServers' | 'servers',
): Record<string, unknown> {
  const root = { ...existing }
  const prev = (root[mapKey] as Record<string, unknown> | undefined) ?? {}
  if (!Object.prototype.hasOwnProperty.call(prev, key))
    throw new Error(`No server named "${key}" in this config.`)
  const next = { ...prev }
  delete next[key]
  root[mapKey] = next
  return root
}
