import { app } from 'electron'
import os from 'node:os'

/**
 * macOS 26 (Darwin kernel 25+) can hit EXC_BREAKPOINT during Chromium/V8 startup.
 * Apply jitless before loading the rest of the main bundle. See electron/electron#49522
 *
 * Opt out: MCP_DOCK_DISABLE_JITLESS=1
 */
async function start() {
  if (process.env.MCP_DOCK_DISABLE_JITLESS !== '1' && process.platform === 'darwin') {
    const darwinMajor = Number.parseInt(os.release().split('.')[0] ?? '0', 10)
    if (!Number.isNaN(darwinMajor) && darwinMajor >= 25 && !app.commandLine.hasSwitch('js-flags')) {
      app.commandLine.appendSwitch('js-flags', '--jitless')
    }
  }
  await import('./index-app.js')
}

void start().catch((err) => {
  console.error(err)
  process.exit(1)
})
