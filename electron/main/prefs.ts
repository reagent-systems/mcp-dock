import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { readJsonObject, atomicWriteJson } from './file-utils.js'

export type McpClient = 'cursor' | 'claude' | 'vscode'

export interface AppPrefs {
  backupOnWrite: boolean
  pathOverrides: Partial<Record<McpClient, string>>
  defaultClient: McpClient
}

const DEFAULT_PREFS: AppPrefs = {
  backupOnWrite: true,
  pathOverrides: {},
  defaultClient: 'cursor',
}

export function prefsPath() {
  return path.join(app.getPath('userData'), 'mcp-dock-prefs.json')
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = readJsonObject(prefsPath()) as Partial<AppPrefs>
    return {
      backupOnWrite: raw.backupOnWrite ?? DEFAULT_PREFS.backupOnWrite,
      pathOverrides: (raw.pathOverrides ?? {}) as AppPrefs['pathOverrides'],
      defaultClient: (raw.defaultClient ?? DEFAULT_PREFS.defaultClient) as McpClient,
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
  }
  savePrefs(next)
  return next
}

/** Strip legacy `catalogExtras` from prefs file if present. */
export function ensurePrefsFile() {
  const p = prefsPath()
  if (!fs.existsSync(p)) {
    savePrefs(DEFAULT_PREFS)
    return
  }
  try {
    const raw = readJsonObject(p) as Record<string, unknown>
    if ('catalogExtras' in raw) savePrefs(loadPrefs())
  }
  catch {
    /* ignore corrupt prefs */
  }
}
