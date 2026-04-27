import { ipcMain, shell } from 'electron'
import type { RegistryServer } from '../../shared/registry.js'
import { mergeMcpServersMap, removeFromMap } from './config-merge.js'
import { readJsonObject, backupIfExists, atomicWriteJson } from './file-utils.js'
import { enrichCatalogListingIfNeeded } from './catalog-enrich.js'
import { buildInstallPlan } from './install-plan.js'
import { resolveConfigPath, defaultConfigPath } from './paths.js'
import type { AppPrefs, McpClient } from './prefs.js'
import { loadPrefs, updatePrefs } from './prefs.js'

function mapKeyFor(client: McpClient): 'mcpServers' | 'servers' {
  return client === 'vscode' ? 'servers' : 'mcpServers'
}

function summarizeEntry(val: unknown): string {
  if (!val || typeof val !== 'object') return ''
  const o = val as Record<string, unknown>
  if (typeof o.command === 'string')
    return `${o.command} ${Array.isArray(o.args) ? (o.args as string[]).join(' ') : ''}`.trim()
  if (typeof o.url === 'string') return o.url
  return ''
}

export function registerMcpDockIpc() {
  ipcMain.handle('mcp-dock:default-paths', () => ({
    cursor: defaultConfigPath('cursor'),
    claude: defaultConfigPath('claude'),
    vscode: defaultConfigPath('vscode'),
  }))

  ipcMain.handle('mcp-dock:get-prefs', (): AppPrefs => loadPrefs())

  ipcMain.handle('mcp-dock:set-prefs', (_, patch: Partial<AppPrefs>) => updatePrefs(patch))

  ipcMain.handle('mcp-dock:enrich-mcpservers-org', (_, server: RegistryServer) =>
    enrichCatalogListingIfNeeded(server),
  )

  ipcMain.handle(
    'mcp-dock:install',
    async (
      _,
      payload: {
        client: McpClient
        serverKey: string
        server: RegistryServer
        env: Record<string, string>
        headers: Record<string, string>
      },
    ) => {
      const { client, serverKey, env, headers } = payload
      let { server } = payload
      if (!/^[\w-]+$/.test(serverKey))
        throw new Error('Server key must contain only letters, numbers, underscores, and hyphens.')
      const prefs = loadPrefs()
      const file = resolveConfigPath(client, prefs.pathOverrides)
      server = await enrichCatalogListingIfNeeded(server)
      const plan = buildInstallPlan(server, env, headers)
      if (!plan.ok) throw new Error(plan.message)
      const entry = client === 'vscode' ? plan.vscode : plan.cursorClaude
      const existing = readJsonObject(file)
      const merged = mergeMcpServersMap(existing, serverKey, entry, mapKeyFor(client))
      if (prefs.backupOnWrite) backupIfExists(file)
      atomicWriteJson(file, merged)
      return { path: file }
    },
  )

  ipcMain.handle('mcp-dock:remove', (_, payload: { client: McpClient; serverKey: string }) => {
    const { client, serverKey } = payload
    const prefs = loadPrefs()
    const file = resolveConfigPath(client, prefs.pathOverrides)
    const existing = readJsonObject(file)
    const merged = removeFromMap(existing, serverKey, mapKeyFor(client))
    if (prefs.backupOnWrite) backupIfExists(file)
    atomicWriteJson(file, merged)
    return { path: file }
  })

  ipcMain.handle('mcp-dock:list-installed', (_, client: McpClient) => {
    const prefs = loadPrefs()
    const file = resolveConfigPath(client, prefs.pathOverrides)
    const root = readJsonObject(file)
    const map = (root[mapKeyFor(client)] as Record<string, unknown> | undefined) ?? {}
    return {
      path: file,
      keys: Object.keys(map),
      entries: Object.entries(map).map(([key, val]) => ({
        key,
        summary: summarizeEntry(val),
      })),
    }
  })

  ipcMain.handle('mcp-dock:reveal-config', (_, client: McpClient) => {
    const prefs = loadPrefs()
    const file = resolveConfigPath(client, prefs.pathOverrides)
    shell.showItemInFolder(file)
  })
}
