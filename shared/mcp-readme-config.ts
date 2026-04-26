/**
 * Pull stdio-shaped MCP client config from Markdown fenced JSON (README snippets).
 * Matches Cursor/Claude style: { "mcpServers": { "key": { "command", "args", "env?" } } }.
 */

import type { McpDockStdioHint } from './registry.js'

function isRemoteOnlyEntry(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false
  const o = entry as { url?: unknown; command?: unknown }
  return typeof o.url === 'string' && typeof o.command !== 'string'
}

function isStdioShapedEntry(entry: unknown): entry is { command: string; args: string[]; env?: unknown } {
  if (!entry || typeof entry !== 'object') return false
  if (isRemoteOnlyEntry(entry)) return false
  const command = (entry as { command?: unknown }).command
  const args = (entry as { args?: unknown }).args
  if (typeof command !== 'string' || !command.trim()) return false
  if (!Array.isArray(args) || !args.every(a => typeof a === 'string')) return false
  return true
}

function normalizeEnv(env: unknown): Record<string, string> | undefined {
  if (!env || typeof env !== 'object' || Array.isArray(env)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

/** First matching mcpServers entry with command + args (stdio). Skips HTTP-only `{ url }` entries. */
export function extractMcpServersStdioFromMarkdown(markdown: string): McpDockStdioHint | undefined {
  for (const m of markdown.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    const raw = m[1].trim()
    if (!/mcpServers/i.test(raw)) continue
    let j: unknown
    try {
      j = JSON.parse(raw)
    }
    catch {
      continue
    }
    if (!j || typeof j !== 'object') continue
    const root = j as Record<string, unknown>
    const ms = root.mcpServers ?? root.mcp_servers
    if (!ms || typeof ms !== 'object' || Array.isArray(ms)) continue
    for (const val of Object.values(ms as Record<string, unknown>)) {
      if (!isStdioShapedEntry(val)) continue
      const env = normalizeEnv(val.env)
      return {
        command: val.command.trim(),
        args: [...val.args],
        ...(env ? { env } : {}),
      }
    }
  }
  return undefined
}
