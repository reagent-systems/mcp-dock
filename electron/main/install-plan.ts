import type {
  RegistryEnvVar,
  RegistryPackage,
  RegistryServer,
} from '../../shared/registry.js'
import { resolveRegistryInstallTarget } from '../../shared/install-target.js'
import { filterLatestOnly, suggestServerKey } from '../../shared/install.js'

export { filterLatestOnly, suggestServerKey }

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

function planFromReadmeStdioHint(
  server: RegistryServer,
  env: Record<string, string>,
): InstallPlanOk {
  const h = server.mcpDockStdioHint!
  const mergedEnv: Record<string, string> = { ...(h.env ?? {}) }
  for (const [k, v] of Object.entries(env)) {
    if (String(v).length) mergedEnv[k] = String(v)
  }
  const cursorClaude: Record<string, unknown> = {
    command: h.command,
    args: h.args,
    ...(Object.keys(mergedEnv).length ? { env: mergedEnv } : {}),
  }
  const vscode: Record<string, unknown> = {
    type: 'stdio',
    command: h.command,
    args: h.args,
    ...(Object.keys(mergedEnv).length ? { env: mergedEnv } : {}),
  }
  return {
    ok: true,
    requiredEnv: [],
    requiredHeaders: [],
    cursorClaude,
    vscode,
  }
}

export function buildInstallPlan(
  server: RegistryServer,
  env: Record<string, string>,
  headerValues: Record<string, string>,
): InstallPlanError | InstallPlanOk {
  const target = resolveRegistryInstallTarget(server)

  if (target.ok) {
    if (target.kind === 'npm') {
      const pkg = target.pkg
      const id = pkg.identifier
      const ver = pkg.version
      const envDefs = collectEnvDefs(pkg)
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

    if (target.kind === 'pypi') {
      const pkg = target.pkg
      const id = pkg.identifier
      const ver = pkg.version
      const envDefs = collectEnvDefs(pkg)
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

    const remote = target.remote
    const headersDef = remote.headers ?? []
    const missingH = headersDef.filter(h => h.isRequired && !(h.name in headerValues && String(headerValues[h.name]).length))
    if (missingH.length)
      return { ok: false, message: `Missing required headers: ${missingH.map(h => h.name).join(', ')}` }
    const headers: Record<string, string> = {}
    for (const h of headersDef) {
      const v = headerValues[h.name]
      if (v !== undefined && String(v).length) headers[h.name] = String(v)
    }

    const isSse = remote.type.toLowerCase() === 'sse'
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

  if (server.mcpDockStdioHint) return planFromReadmeStdioHint(server, env)

  return { ok: false, message: target.message }
}
