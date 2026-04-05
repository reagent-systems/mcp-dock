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
}

export interface RegistryOfficialMeta {
  isLatest?: boolean
  status?: string
}

export interface RegistryListItem {
  server: RegistryServer
  _meta?: Record<string, RegistryOfficialMeta | undefined>
}

export interface RegistryListResponse {
  servers: RegistryListItem[]
  metadata?: { nextCursor?: string; count?: number }
}
