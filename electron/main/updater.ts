import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const START_DELAY_MS = 4_000

function log(msg: string, err?: unknown): void {
  if (err !== undefined) console.error(`[mcp-dock:updater] ${msg}`, err)
  else console.log(`[mcp-dock:updater] ${msg}`)
}

/**
 * Check GitHub Releases for newer builds (electron-builder publish metadata).
 * Skips dev, Linux (no supported auto-update flow for current tar.gz target), and when MCP_DOCK_SKIP_UPDATES=1.
 */
export function setupAutoUpdater(devMode: boolean): void {
  if (devMode) return
  if (process.env.MCP_DOCK_SKIP_UPDATES === '1') return
  if (process.platform !== 'darwin' && process.platform !== 'win32') return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => log('error', err))
  autoUpdater.on('checking-for-update', () => log('checking-for-update'))
  autoUpdater.on('update-available', (info) => log(`update-available → ${info.version}`))
  autoUpdater.on('update-not-available', () => log('update-not-available'))
  autoUpdater.on('update-downloaded', (info) => log(`update-downloaded → ${info.version}`))

  const check = () => {
    void autoUpdater.checkForUpdatesAndNotify().catch((e) => log('checkForUpdatesAndNotify failed', e))
  }

  setTimeout(check, START_DELAY_MS)
  setInterval(check, CHECK_INTERVAL_MS)
}
