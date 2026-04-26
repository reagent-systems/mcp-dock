import type {
  RegistryEnvVar,
  RegistryPackage,
  RegistryServer,
} from '../../shared/registry.js'
import { filterLatestOnly, suggestServerKey } from '../../shared/install.js'

export { filterLatestOnly, suggestServerKey }

function hasTemplate(url: string) {
  return /\{[^}]+\}/.test(url)
}

function collectEnvDefs(pkg?: RegistryPackage): RegistryEnvVar[] {
  return [...(pkg?.environmentVariables ?? [])]
}

export type InstallPlanError = { ok: false; message: string }
export type InstallPlanOk = {
  ok: true
  requiredEnv: RegistryEnvVar[]
  requiredHeaders: { name: string; description?: string; isRequired?: boolean }[]
  cursorClaude: Record<string, unknown>
  vscode: Record<string, unknown>
}

export function buildInstallPlan(
  server: RegistryServer,
  env: Record<string, string>,
  headerValues: Record<string, string>,
): InstallPlanError | InstallPlanOk {
  const pkgs = server.packages ?? []
  const stdioNpm = pkgs.find(p => p.registryType === 'npm' && p.transport?.type === 'stdio')
  const stdioPypi = pkgs.find(p => p.registryType === 'pypi' && p.transport?.type === 'stdio')
  const ociOnly = pkgs.length > 0 && pkgs.every(p => p.registryType === 'oci') && !stdioNpm && !stdioPypi
  if (ociOnly)
    return { ok: false, message: 'OCI / container-based installs are not supported in MCP Dock yet. Add this server manually.' }

  if (stdioNpm) {
    const id = stdioNpm.identifier
    const ver = stdioNpm.version
    const envDefs = collectEnvDefs(stdioNpm)
    const missing = envDefs.filter(d => d.isRequired && !(d.name in env && String(env[d.name]).length))
    if (missing.length)
      return { ok: false, message: `Missing required environment variables: ${missing.map(m => m.name).join(', ')}` }

    const cleaned: Record<string, string> = {}
    for (const d of envDefs) {
      const v = env[d.name] ?? d.default
      if (v !== undefined && String(v).length) cleaned[d.name] = String(v)
    }
    const cursorClaude = {
      command: 'npx',
      args: ['-y', `${id}@${ver}`],
      ...(Object.keys(cleaned).length ? { env: cleaned } : {}),
    }
    const vscode = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', `${id}@${ver}`],
      ...(Object.keys(cleaned).length ? { env: cleaned } : {}),
    }
    return {
      ok: true,
      requiredEnv: envDefs,
      requiredHeaders: [],
      cursorClaude,
      vscode,
    }
  }

  if (stdioPypi) {
    const id = stdioPypi.identifier
    const ver = stdioPypi.version
    const envDefs = collectEnvDefs(stdioPypi)
    const missing = envDefs.filter(d => d.isRequired && !(d.name in env && String(env[d.name]).length))
    if (missing.length)
      return { ok: false, message: `Missing required environment variables: ${missing.map(m => m.name).join(', ')}` }

    const cleaned: Record<string, string> = {}
    for (const d of envDefs) {
      const v = env[d.name] ?? d.default
      if (v !== undefined && String(v).length) cleaned[d.name] = String(v)
    }
    const cursorClaude = {
      command: 'uvx',
      args: [`${id}==${ver}`],
      ...(Object.keys(cleaned).length ? { env: cleaned } : {}),
    }
    const vscode = {
      type: 'stdio',
      command: 'uvx',
      args: [`${id}==${ver}`],
      ...(Object.keys(cleaned).length ? { env: cleaned } : {}),
    }
    return {
      ok: true,
      requiredEnv: envDefs,
      requiredHeaders: [],
      cursorClaude,
      vscode,
    }
  }

  const remote = server.remotes?.find((r) => {
    const t = r.type === 'streamableHttp' ? 'streamable-http' : r.type
    return (t === 'streamable-http' || t === 'http' || t === 'sse') && r.url && !hasTemplate(r.url)
  })
  if (remote) {
    const headersDef = remote.headers ?? []
    const missingH = headersDef.filter(h => h.isRequired && !(h.name in headerValues && String(headerValues[h.name]).length))
    if (missingH.length)
      return { ok: false, message: `Missing required headers: ${missingH.map(h => h.name).join(', ')}` }
    const headers: Record<string, string> = {}
    for (const h of headersDef) {
      const v = headerValues[h.name]
      if (v !== undefined && String(v).length) headers[h.name] = String(v)
    }

    const isSse = remote.type === 'sse'
    const vscodeType = isSse ? 'sse' : 'http'
    const cursorClaude: Record<string, unknown> = {
      url: remote.url,
      ...(Object.keys(headers).length ? { headers } : {}),
    }
    const vscode: Record<string, unknown> = {
      type: vscodeType,
      url: remote.url,
      ...(Object.keys(headers).length ? { headers } : {}),
    }
    return {
      ok: true,
      requiredEnv: [],
      requiredHeaders: headersDef,
      cursorClaude,
      vscode,
    }
  }

  if (server.remotes?.some(r => r.url && hasTemplate(r.url)))
    return { ok: false, message: 'This server URL contains placeholders (for example {HOST}). Configure it manually in your MCP JSON.' }

  return {
    ok: false,
    message: 'No supported install target for this listing (needs an npm/pypi stdio package or a concrete HTTP remote URL).',
  }
}
