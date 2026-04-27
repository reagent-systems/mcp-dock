import { describe, expect, it } from 'vitest'
import { mergeMcpServersMap, removeFromMap } from '../electron/main/config-merge'

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
