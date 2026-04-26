import { describe, expect, it } from 'vitest'
import { extractMcpServersStdioFromMarkdown } from '../shared/mcp-readme-config'

describe('extractMcpServersStdioFromMarkdown', () => {
  it('extracts python3 + args from Comfy-Pilot style README', () => {
    const md = `
Check \`~/.claude.json\`:

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
    const h = extractMcpServersStdioFromMarkdown(md)
    expect(h).toEqual({
      command: 'python3',
      args: ['/path/to/comfy-pilot/mcp_server.py'],
    })
  })

  it('skips url-only HTTP entries', () => {
    const md = `\`\`\`json
{ "mcpServers": { "x": { "url": "https://example.com/mcp" } } }
\`\`\``
    expect(extractMcpServersStdioFromMarkdown(md)).toBeUndefined()
  })

  it('reads env when present', () => {
    const md = `\`\`\`json
{ "mcpServers": { "a": { "command": "node", "args": ["x.js"], "env": { "FOO": "bar" } } } }
\`\`\``
    expect(extractMcpServersStdioFromMarkdown(md)).toEqual({
      command: 'node',
      args: ['x.js'],
      env: { FOO: 'bar' },
    })
  })
})
