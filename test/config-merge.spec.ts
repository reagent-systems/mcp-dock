import { describe, expect, it } from 'vitest'
import { mergeOfficialAndExtras } from '../shared/catalog'
import { mergeMcpServersMap, removeFromMap } from '../electron/main/config-merge'
import type { RegistryListItem } from '../shared/registry'

describe('config-merge', () => {
  it('merges mcpServers without clobbering', () => {
    const next = mergeMcpServersMap(
      { mcpServers: { a: { command: 'x' } } },
      'b',
      { command: 'y' },
      'mcpServers',
    ) as { mcpServers: Record<string, unknown> }
    expect(next.mcpServers.a).toEqual({ command: 'x' })
    expect(next.mcpServers.b).toEqual({ command: 'y' })
  })

  it('throws on duplicate key', () => {
    expect(() =>
      mergeMcpServersMap({ mcpServers: { a: {} } }, 'a', { command: 'z' }, 'mcpServers'),
    ).toThrow(/already exists/)
  })

  it('removes server key', () => {
    const next = removeFromMap(
      { mcpServers: { a: { x: 1 }, b: { y: 2 } } },
      'a',
      'mcpServers',
    ) as { mcpServers: Record<string, unknown> }
    expect(next.mcpServers).toEqual({ b: { y: 2 } })
  })
})

describe('mergeOfficialAndExtras', () => {
  const row = (name: string, version: string): RegistryListItem => ({
    server: { name, version, description: '' },
  })

  it('prefers official on duplicate name@version', () => {
    const merged = mergeOfficialAndExtras([row('a', '1')], [{ label: 'Extra', rows: [row('a', '1'), row('b', '2')] }])
    const byName = Object.fromEntries(merged.map((r) => [r.server.name, r]))
    expect(byName.a._catalogLabel).toBeUndefined()
    expect(byName.b._catalogLabel).toBe('Extra')
  })
})
