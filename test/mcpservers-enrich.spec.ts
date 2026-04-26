import { describe, expect, it } from 'vitest'
import {
  extractNpmStdioPackagesFromMcpserversDetailHtml,
  extractRemotesFromMcpserversDetailHtml,
  mcpserversDetailPageUrl,
} from '../electron/main/mcpservers-enrich'

describe('mcpserversDetailPageUrl', () => {
  it('supports deep /servers/... paths', () => {
    const u = mcpserversDetailPageUrl({
      name: 'mcpservers.org/servers/browserbase/mcp-server-browserbase',
      version: '0.0.0',
    })
    expect(u).toBe('https://mcpservers.org/servers/browserbase/mcp-server-browserbase')
  })
})

describe('extractRemotesFromMcpserversDetailHtml', () => {
  it('parses streamableHttp url and headers from embedded JSON', () => {
    const html = `
      <div>
      "type": "streamableHttp",
      "url": "https://www.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
      </div>
    `
    const r = extractRemotesFromMcpserversDetailHtml(html)
    expect(r.length).toBeGreaterThanOrEqual(1)
    expect(r[0].url).toBe('https://www.example.com/api/mcp')
    expect(r[0].type).toBe('streamable-http')
    expect(r[0].headers?.some(h => h.name === 'Authorization')).toBe(true)
  })

  it('finds /api/mcp hrefs', () => {
    const html = '<a href="https://api.service.test/api/mcp">link</a>'
    const r = extractRemotesFromMcpserversDetailHtml(html)
    expect(r.some(x => x.url === 'https://api.service.test/api/mcp')).toBe(true)
  })

  it('ignores vscode.dev install redirect URLs', () => {
    const html =
      'https://insiders.vscode.dev/redirect/mcp/install?name=x&config=%7B%22command%22%3A%22npx%22%7D'
    const r = extractRemotesFromMcpserversDetailHtml(html)
    expect(r.some(x => x.url.includes('vscode.dev'))).toBe(false)
  })
})

describe('extractNpmStdioPackagesFromMcpserversDetailHtml', () => {
  it('parses args array with -y package', () => {
    const html = `"command": "npx", "args": ["-y", "firecrawl-mcp"], "env": { "FIRECRAWL_API_KEY": "fc-YOUR_KEY" }`
    const pkgs = extractNpmStdioPackagesFromMcpserversDetailHtml(html)
    expect(pkgs.some(p => p.identifier === 'firecrawl-mcp')).toBe(true)
  })

  it('parses npx -y in markdown', () => {
    const html = 'Run `npx -y @scope/cool-mcp` locally'
    const pkgs = extractNpmStdioPackagesFromMcpserversDetailHtml(html)
    expect(pkgs.some(p => p.identifier === '@scope/cool-mcp')).toBe(true)
  })

  it('skips smithery cli install lines', () => {
    const html = 'npx -y @smithery/cli install @vendor/pkg --client claude'
    const pkgs = extractNpmStdioPackagesFromMcpserversDetailHtml(html)
    expect(pkgs.length).toBe(0)
  })
})
