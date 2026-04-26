import { describe, expect, it } from 'vitest'
import { mergeGithubInstallDocIntoServer, parseGithubCoordsForEnrich } from '../electron/main/github-readme-enrich'
import type { RegistryServer } from '../shared/registry'

describe('parseGithubCoordsForEnrich', () => {
  it('falls back to repository.url when name is not github.com/…', () => {
    const s: RegistryServer = {
      name: 'co.example/widget',
      version: '1.0.0',
      repository: { url: 'https://github.com/ConstantineB6/comfy-pilot', source: 'github' },
    }
    expect(parseGithubCoordsForEnrich(s)).toEqual({ owner: 'ConstantineB6', repo: 'comfy-pilot' })
  })
})

describe('mergeGithubInstallDocIntoServer', () => {
  it('extracts npx -y from README-style markdown', () => {
    const stub: RegistryServer = {
      name: 'github.com/8randonpickart5/alderpost-mcp',
      version: '0.0.0',
    }
    const readme = `
## Install
\`\`\`json
{
  "mcpServers": {
    "alderpost": {
      "command": "npx",
      "args": ["-y", "alderpost-mcp"]
    }
  }
}
\`\`\`
`
    const next = mergeGithubInstallDocIntoServer(stub, readme)
    expect(next.packages?.some(p => p.identifier === 'alderpost-mcp' && p.registryType === 'npm')).toBe(true)
  })

  it('extracts mcpServers stdio block (python3)', () => {
    const stub: RegistryServer = {
      name: 'github.com/ConstantineB6/comfy-pilot',
      version: '0.0.0',
    }
    const readme = `
\`\`\`json
{
  "mcpServers": {
    "comfyui": {
      "command": "python3",
      "args": ["/path/to/comfy-pilot/mcp_server.py"]
    }
  }
}
\`\`\`
`
    const next = mergeGithubInstallDocIntoServer(stub, readme)
    expect(next.mcpDockStdioHint).toEqual({
      command: 'python3',
      args: ['/path/to/comfy-pilot/mcp_server.py'],
    })
  })
})
