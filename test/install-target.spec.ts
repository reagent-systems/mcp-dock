import { describe, expect, it } from 'vitest'
import { parseGithubCatalogStubCoords, resolveRegistryInstallTarget } from '../shared/install-target'
import type { RegistryServer } from '../shared/registry'

describe('parseGithubCatalogStubCoords', () => {
  it('parses github.com/owner/repo names', () => {
    const s: RegistryServer = {
      name: 'github.com/8randonpickart5/alderpost-mcp',
      version: '0.0.0',
    }
    expect(parseGithubCatalogStubCoords(s)).toEqual({ owner: '8randonpickart5', repo: 'alderpost-mcp' })
  })
})

describe('resolveRegistryInstallTarget', () => {
  it('accepts npm stdio', () => {
    const s: RegistryServer = {
      name: 'x',
      version: '1',
      packages: [{ registryType: 'npm', identifier: '@foo/bar', version: '1.0.0', transport: { type: 'stdio' } }],
    }
    const r = resolveRegistryInstallTarget(s)
    expect(r.ok && r.kind === 'npm').toBe(true)
  })

  it('accepts streamable-http remote', () => {
    const s: RegistryServer = {
      name: 'x',
      version: '1',
      remotes: [{ type: 'streamable-http', url: 'https://example.com/mcp' }],
    }
    const r = resolveRegistryInstallTarget(s)
    expect(r.ok && r.kind === 'remote').toBe(true)
  })

  it('rejects OCI-only', () => {
    const s: RegistryServer = {
      name: 'x',
      version: '1',
      packages: [{ registryType: 'oci', identifier: 'img', version: '1', transport: { type: 'stdio' } }],
    }
    const r = resolveRegistryInstallTarget(s)
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.message).toMatch(/OCI/i)
  })

  it('rejects npm with only streamable-http transport', () => {
    const s: RegistryServer = {
      name: 'x',
      version: '1',
      packages: [
        { registryType: 'npm', identifier: 'pkg', version: '1', transport: { type: 'streamable-http' } },
      ],
    }
    const r = resolveRegistryInstallTarget(s)
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.message).toMatch(/remote HTTP transport/i)
  })

  it('rejects empty packages and remotes', () => {
    const s: RegistryServer = { name: 'x', version: '1' }
    const r = resolveRegistryInstallTarget(s)
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.message).toMatch(/does not include packages or remote/i)
  })

  it('rejects template remote when no concrete URL', () => {
    const s: RegistryServer = {
      name: 'x',
      version: '1',
      remotes: [{ type: 'streamable-http', url: 'https://x.com/mcp?k={api_key}' }],
    }
    const r = resolveRegistryInstallTarget(s)
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.message).toMatch(/placeholder/i)
  })
})
