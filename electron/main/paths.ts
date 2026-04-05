import os from 'node:os'
import path from 'node:path'
import type { McpClient } from './prefs.js'

function home() {
  return os.homedir()
}

export function defaultConfigPath(client: McpClient): string {
  const h = home()
  switch (client) {
    case 'cursor':
      return path.join(h, '.cursor', 'mcp.json')
    case 'claude': {
      if (process.platform === 'darwin')
        return path.join(h, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      if (process.platform === 'win32')
        return path.join(process.env.APPDATA ?? path.join(h, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
      return path.join(h, '.config', 'Claude', 'claude_desktop_config.json')
    }
    case 'vscode': {
      if (process.platform === 'darwin')
        return path.join(h, 'Library', 'Application Support', 'Code', 'User', 'mcp.json')
      if (process.platform === 'win32')
        return path.join(process.env.APPDATA ?? path.join(h, 'AppData', 'Roaming'), 'Code', 'User', 'mcp.json')
      return path.join(h, '.config', 'Code', 'User', 'mcp.json')
    }
    default: {
      const _never: never = client
      return _never
    }
  }
}

export function resolveConfigPath(
  client: McpClient,
  overrides: Partial<Record<McpClient, string>>,
): string {
  const o = overrides[client]?.trim()
  return o && o.length > 0 ? o : defaultConfigPath(client)
}
