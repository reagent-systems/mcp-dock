/** Shapes from https://registry.modelcontextprotocol.io/v0/servers (subset). */

export interface RegistryRemoteHeader {
  name: string
  description?: string
  isRequired?: boolean
  isSecret?: boolean
}

export interface RegistryRemote {
  type: string
  url: string
  headers?: RegistryRemoteHeader[]
}

export interface RegistryEnvVar {
  name: string
  description?: string
  isRequired?: boolean
  isSecret?: boolean
  default?: string
}

export interface RegistryPackageTransport {
  type: string
  url?: string
}

export interface RegistryPackage {
  registryType: string
  identifier: string
  version: string
  registryBaseUrl?: string
  transport?: RegistryPackageTransport
  environmentVariables?: RegistryEnvVar[]
}

/** README / enrichment: literal command+args when not expressible as npm/pypi (e.g. python3 path to mcp_server.py). */
export interface McpDockStdioHint {
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface RegistryServer {
  name: string
  title?: string
  description?: string
  version: string
  repository?: { url?: string; source?: string }
  websiteUrl?: string
  icons?: { src: string; mimeType?: string }[]
  packages?: RegistryPackage[]
  remotes?: RegistryRemote[]
  /** Set by MCP Dock enrichment when a README contains an mcpServers stdio block. Not part of the official registry schema. */
  mcpDockStdioHint?: McpDockStdioHint
}

export interface RegistryOfficialMeta {
  isLatest?: boolean
  status?: string
}

export interface RegistryListItem {
  server: RegistryServer
  _meta?: Record<string, RegistryOfficialMeta | undefined>
  /** Present when this row came from a user-configured extra catalog (not the primary registry pages). */
  _catalogLabel?: string
}

export interface RegistryListResponse {
  servers: RegistryListItem[]
  metadata?: { nextCursor?: string; count?: number }
}
