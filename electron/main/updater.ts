import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, dialog } from 'electron'

const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const START_DELAY_MS = 4_000

let autoUpdaterListenersAttached = false
let updateReadyDialogVisible = false

function log(msg: string, err?: unknown): void {
  if (err !== undefined) console.error(`[mcp-dock:updater] ${msg}`, err)
  else console.log(`[mcp-dock:updater] ${msg}`)
}

function resolveDevAppUpdateYml(): string {
  const mainDir = path.dirname(fileURLToPath(import.meta.url))
  return path.join(mainDir, '..', '..', 'dev-app-update.yml')
}

function attachAutoUpdaterListeners(): void {
  if (autoUpdaterListenersAttached) return
  autoUpdaterListenersAttached = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (err) => log('error', err))
  autoUpdater.on('checking-for-update', () => log('checking-for-update'))
  autoUpdater.on('update-available', (info) => log(`update-available → ${info.version}`))
  autoUpdater.on('update-not-available', () => log('update-not-available'))
  autoUpdater.on('update-downloaded', (event) => {
    log(`update-downloaded → ${event.version}`)
    if (!app.isPackaged || updateReadyDialogVisible) return
    updateReadyDialogVisible = true
    void (async () => {
      try {
        const { response } = await dialog.showMessageBox({
          type: 'info',
          buttons: ['Restart', 'Later'],
          defaultId: 0,
          cancelId: 1,
          title: 'MCP Dock',
          message: `Version ${event.version} is ready to install.`,
        })
        if (response === 0) {
          autoUpdater.quitAndInstall()
        }
      }
      finally {
        updateReadyDialogVisible = false
      }
    })()
  })
}

function scheduleBackgroundChecks(): void {
  const check = () => {
    void autoUpdater.checkForUpdatesAndNotify().catch((e) => log('checkForUpdatesAndNotify failed', e))
  }
  setTimeout(check, START_DELAY_MS)
  setInterval(check, CHECK_INTERVAL_MS)
}

/**
 * Check GitHub Releases for newer builds (electron-builder publish metadata).
 * Skips background checks when unpackaged (dev); Linux has no supported auto-update target.
 */
export function setupAutoUpdater(): void {
  if (process.env.MCP_DOCK_SKIP_UPDATES === '1') return
  if (process.platform !== 'darwin' && process.platform !== 'win32') return

  attachAutoUpdaterListeners()
  if (!app.isPackaged) return

  scheduleBackgroundChecks()
}

/** File menu — manual check; works in dev when unpackaged (see electron-builder auto-update docs). */
export async function checkForUpdatesFromMenu(): Promise<void> {
  if (process.env.MCP_DOCK_SKIP_UPDATES === '1') return

  if (process.platform === 'linux') {
    await dialog.showMessageBox({
      type: 'info',
      title: 'MCP Dock',
      message: 'In-app updates are not available for Linux.',
      detail: 'Install a newer build from GitHub Releases.',
    })
    return
  }

  if (process.platform !== 'darwin' && process.platform !== 'win32') return

  attachAutoUpdaterListeners()

  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true
    autoUpdater.updateConfigPath = resolveDevAppUpdateYml()
  }

  try {
    const result = await autoUpdater.checkForUpdatesAndNotify()
    if (result && !result.isUpdateAvailable) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'MCP Dock',
        message: `You are on the latest version (${app.getVersion()}).`,
      })
    }
  } catch (e) {
    log('checkForUpdatesFromMenu failed', e)
    await dialog.showMessageBox({
      type: 'error',
      title: 'MCP Dock',
      message: 'Could not check for updates.',
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}
