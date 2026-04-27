/// <reference types="vite/client" />

import type { RegistryServer } from '../shared/registry'

type McpClient = 'cursor' | 'claude' | 'vscode'

interface AppPrefs {
  backupOnWrite: boolean
  pathOverrides: Partial<Record<McpClient, string>>
  defaultClient: McpClient
}

interface McpDockApi {
  getPrefs: () => Promise<AppPrefs>
  setPrefs: (patch: Partial<AppPrefs>) => Promise<AppPrefs>
  defaultPaths: () => Promise<Record<McpClient, string>>
  install: (payload: {
    client: McpClient
    serverKey: string
    server: RegistryServer
    env: Record<string, string>
    headers: Record<string, string>
  }) => Promise<{ path: string }>
  remove: (payload: { client: McpClient; serverKey: string }) => Promise<{ path: string }>
  listInstalled: (client: McpClient) => Promise<{
    path: string
    keys: string[]
    entries: { key: string; summary: string }[]
  }>
  revealConfig: (client: McpClient) => Promise<void>
  /** Enrich HTML catalog rows: mcpservers.org detail page, then GitHub README / package.json for `github.com/o/r` stubs. */
  enrichMcpserversOrgServer: (server: RegistryServer) => Promise<RegistryServer>
}

declare global {
  interface Window {
    mcpDock: McpDockApi
  }
}

export {}
