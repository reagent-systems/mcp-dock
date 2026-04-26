import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { CatalogExtraSource } from '../../shared/catalog.js'
import { readJsonObject, atomicWriteJson } from './file-utils.js'

export type McpClient = 'cursor' | 'claude' | 'vscode'

export interface AppPrefs {
  backupOnWrite: boolean
  pathOverrides: Partial<Record<McpClient, string>>
  defaultClient: McpClient
  /** Additional MCP catalogs (registry-compatible `.../servers` URLs or JSON bundles). */
  catalogExtras: CatalogExtraSource[]
}

/** Directory listing from [mcpservers.org](https://mcpservers.org/) (HTML, paginated in-app). */
export const BUILTIN_MCPSERVERS_ORG_CATALOG: CatalogExtraSource = {
  id: 'built-in-mcpservers-org',
  label: 'mcpservers.org',
  kind: 'html',
  url: 'https://mcpservers.org/all?sort=name',
}

const DEFAULT_PREFS: AppPrefs = {
  backupOnWrite: true,
  pathOverrides: {},
  defaultClient: 'cursor',
  catalogExtras: [BUILTIN_MCPSERVERS_ORG_CATALOG],
}

export function prefsPath() {
  return path.join(app.getPath('userData'), 'mcp-dock-prefs.json')
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = readJsonObject(prefsPath()) as Partial<AppPrefs>
    const extras = Array.isArray(raw.catalogExtras) ? raw.catalogExtras : DEFAULT_PREFS.catalogExtras
    return {
      backupOnWrite: raw.backupOnWrite ?? DEFAULT_PREFS.backupOnWrite,
      pathOverrides: (raw.pathOverrides ?? {}) as AppPrefs['pathOverrides'],
      defaultClient: (raw.defaultClient ?? DEFAULT_PREFS.defaultClient) as McpClient,
      catalogExtras: extras.filter(
        (x): x is CatalogExtraSource =>
          !!x && typeof x === 'object' && typeof (x as CatalogExtraSource).id === 'string',
      ),
    }
  }
  catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: AppPrefs) {
  atomicWriteJson(prefsPath(), prefs)
}

export function updatePrefs(patch: Partial<AppPrefs>): AppPrefs {
  const cur = loadPrefs()
  const next: AppPrefs = {
    backupOnWrite: patch.backupOnWrite ?? cur.backupOnWrite,
    pathOverrides: { ...cur.pathOverrides, ...patch.pathOverrides },
    defaultClient: patch.defaultClient ?? cur.defaultClient,
    catalogExtras: patch.catalogExtras ?? cur.catalogExtras,
  }
  savePrefs(next)
  return next
}

export function ensurePrefsFile() {
  const p = prefsPath()
  if (!fs.existsSync(p)) {
    savePrefs(DEFAULT_PREFS)
    return
  }
  try {
    const cur = loadPrefs()
    let next = cur.catalogExtras.filter(e => e.id !== 'built-in-mcp-registry')
    let changed = next.length !== cur.catalogExtras.length
    if (!next.some(e => e.id === BUILTIN_MCPSERVERS_ORG_CATALOG.id)) {
      next = [...next, BUILTIN_MCPSERVERS_ORG_CATALOG]
      changed = true
    }
    if (changed) savePrefs({ ...cur, catalogExtras: next })
  }
  catch {
    /* ignore corrupt prefs */
  }
}
