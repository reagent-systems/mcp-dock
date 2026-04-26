import { contextBridge, ipcRenderer } from 'electron'
import type { CatalogExtraSource } from '../../shared/catalog.js'
import type { RegistryServer } from '../../shared/registry.js'

export type McpClient = 'cursor' | 'claude' | 'vscode'

export interface AppPrefs {
  backupOnWrite: boolean
  pathOverrides: Partial<Record<McpClient, string>>
  defaultClient: McpClient
  catalogExtras: CatalogExtraSource[]
}

contextBridge.exposeInMainWorld('mcpDock', {
  getPrefs: (): Promise<AppPrefs> => ipcRenderer.invoke('mcp-dock:get-prefs'),
  setPrefs: (patch: Partial<AppPrefs>): Promise<AppPrefs> =>
    ipcRenderer.invoke('mcp-dock:set-prefs', patch),
  defaultPaths: (): Promise<Record<McpClient, string>> =>
    ipcRenderer.invoke('mcp-dock:default-paths'),
  install: (payload: {
    client: McpClient
    serverKey: string
    server: RegistryServer
    env: Record<string, string>
    headers: Record<string, string>
  }): Promise<{ path: string }> => ipcRenderer.invoke('mcp-dock:install', payload),
  remove: (payload: { client: McpClient; serverKey: string }): Promise<{ path: string }> =>
    ipcRenderer.invoke('mcp-dock:remove', payload),
  listInstalled: (
    client: McpClient,
  ): Promise<{ path: string; keys: string[]; entries: { key: string; summary: string }[] }> =>
    ipcRenderer.invoke('mcp-dock:list-installed', client),
  revealConfig: (client: McpClient): Promise<void> =>
    ipcRenderer.invoke('mcp-dock:reveal-config', client),
  fetchCatalogText: (url: string): Promise<string> =>
    ipcRenderer.invoke('mcp-dock:fetch-catalog-text', url),
})

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise<void>((resolve) => {
    if (condition.includes(document.readyState)) resolve()
    else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) resolve()
      })
    }
  })
}

function useLoading() {
  const className = 'loaders-css__square-spin'
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 40px;
  height: 40px;
  background: #edeae3;
  animation: square-spin 2.4s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0c0d0f;
  z-index: 9;
}
`
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')
  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`
  return {
    appendLoading() {
      document.head.appendChild(oStyle)
      document.body.appendChild(oDiv)
    },
    removeLoading() {
      oStyle.remove()
      oDiv.remove()
    },
  }
}

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)
window.onmessage = (ev) => {
  if (ev.data?.payload === 'removeLoading') removeLoading()
}
setTimeout(removeLoading, 1200)
