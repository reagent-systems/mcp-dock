import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { REGISTRY_BOOTSTRAP_PAGE_COUNT } from '../shared/official-registry'
import { builtinDiscoverServers } from '../shared/builtin-discover-servers'
import { catalogRowKey } from '../shared/catalog'
import { fetchRegistryPage } from './lib/registry-api'
import type { RegistryListItem, RegistryServer } from '../shared/registry'
import {
  discoverInstallGate,
  mayResolveViaGithubReadmeEnrich,
  resolveRegistryInstallTarget,
} from '../shared/install-target'
import { filterLatestOnly, listRequiredInputs, suggestServerKey } from '../shared/install'

type Tab = 'discover' | 'installed' | 'settings'
type McpClient = 'cursor' | 'claude' | 'vscode'

function transportLabel(server: RegistryServer): string {
  const p = server.packages?.[0]
  if (p?.transport?.type === 'stdio') {
    if (p.registryType === 'npm') return 'stdio · npm'
    if (p.registryType === 'pypi') return 'stdio · PyPI'
    return `stdio · ${p.registryType}`
  }
  const r = server.remotes?.[0]
  if (r?.type === 'streamable-http') return 'remote · HTTP'
  if (r?.type === 'sse') return 'remote · SSE'
  if (r?.url) return `remote · ${r.type}`
  return 'see details'
}

export default function App() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('discover')
  const [search, setSearch] = useState('')
  const [installableOnly, setInstallableOnly] = useState(false)
  const [selected, setSelected] = useState<RegistryServer | null>(null)
  const [installOpen, setInstallOpen] = useState(false)

  const prefsQ = useQuery({ queryKey: ['prefs'], queryFn: () => window.mcpDock.getPrefs() })

  const registryQ = useInfiniteQuery({
    queryKey: ['registry'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRegistryPage(pageParam),
    getNextPageParam: (last) => last.metadata?.nextCursor ?? undefined,
  })

  /** Same cursor chain as `?cursor=` on the registry API — prefetch a few pages on Discover. */
  useEffect(() => {
    if (tab !== 'discover') return
    const q = registryQ
    if (q.status !== 'success' || !q.data) return
    if (q.data.pages.length >= REGISTRY_BOOTSTRAP_PAGE_COUNT) return
    if (!q.hasNextPage) return
    if (q.isFetchingNextPage || q.isFetching) return
    void q.fetchNextPage()
  }, [
    tab,
    registryQ.status,
    registryQ.data?.pages.length,
    registryQ.hasNextPage,
    registryQ.isFetchingNextPage,
    registryQ.isFetching,
    registryQ.fetchNextPage,
  ])

  const items = useMemo(() => {
    const official = filterLatestOnly(registryQ.data?.pages.flatMap((p) => p.servers) ?? [])
    return [...builtinDiscoverServers, ...official]
  }, [registryQ.data])

  const filtered = useMemo(() => {
    let rows = items
    if (installableOnly) {
      rows = rows.filter((row) => {
        const s = row.server
        if (s.name.startsWith('mcpservers.org/servers/')) return true
        if (mayResolveViaGithubReadmeEnrich(s)) return true
        return resolveRegistryInstallTarget(s).ok
      })
    }
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const s = row.server
      const hay = `${s.name} ${s.title ?? ''} ${s.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, installableOnly, search])

  const registryPageCount = registryQ.data?.pages.length ?? 0

  return (
    <div className="flex h-full min-h-0 bg-[#0c0d0f] text-[#edeae3]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#252830] bg-[#0f1013]">
        <div className="border-b border-[#252830] px-4 py-5">
          <div className="text-lg font-semibold tracking-tight">MCP Dock</div>
          <p className="mt-1 text-xs text-[#8b9099]">Browse the official MCP registry and curated picks.</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <SideBtn active={tab === 'discover'} onClick={() => setTab('discover')}>
            Discover
          </SideBtn>
          <SideBtn active={tab === 'installed'} onClick={() => setTab('installed')}>
            Installed
          </SideBtn>
          <SideBtn active={tab === 'settings'} onClick={() => setTab('settings')}>
            Settings
          </SideBtn>
        </nav>
        <div className="mt-auto border-t border-[#252830] p-3 text-[10px] leading-snug text-[#6d7178]">
          Discover uses the{' '}
          <a className="text-[#9ccfd8]" href="https://registry.modelcontextprotocol.io/docs" target="_blank" rel="noreferrer">
            MCP Registry
          </a>{' '}
          (paginated) plus curated picks at the top.
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {tab === 'discover' && (
          <DiscoverPane
            registryQ={registryQ}
            registryPageCount={registryPageCount}
            installableOnly={installableOnly}
            setInstallableOnly={setInstallableOnly}
            search={search}
            setSearch={setSearch}
            filtered={filtered}
            selected={selected}
            onSelect={(row) => {
              setSelected(row.server)
              setInstallOpen(false)
            }}
            onInstall={() => setInstallOpen(true)}
          />
        )}
        {tab === 'installed' && <InstalledPane />}
        {tab === 'settings' && <SettingsPane />}
      </main>

      {installOpen && selected && (
        <InstallModal
          server={selected}
          onClose={() => setInstallOpen(false)}
          onDone={() => {
            setInstallOpen(false)
            void qc.invalidateQueries({ queryKey: ['installed'] })
          }}
        />
      )}
    </div>
  )
}

function SideBtn(props: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm transition ${
        props.active
          ? 'bg-[#1b1d24] text-[#edeae3] ring-1 ring-[#c4f542]/35'
          : 'text-[#bfc3c9] hover:bg-[#16181e]'
      }`}
    >
      {props.children}
    </button>
  )
}

function DiscoverPane(props: {
  registryQ: ReturnType<typeof useInfiniteQuery>
  registryPageCount: number
  installableOnly: boolean
  setInstallableOnly: (v: boolean) => void
  search: string
  setSearch: (v: string) => void
  filtered: RegistryListItem[]
  selected: RegistryServer | null
  onSelect: (row: RegistryListItem) => void
  onInstall: () => void
}) {
  const {
    registryQ,
    registryPageCount,
    installableOnly,
    setInstallableOnly,
    search,
    setSearch,
    filtered,
    selected,
    onSelect,
    onInstall,
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const registryQRef = useRef(registryQ)
  registryQRef.current = registryQ

  useEffect(() => {
    const root = scrollRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        const q = registryQRef.current
        if (!q.hasNextPage || q.isFetchingNextPage) return
        void q.fetchNextPage()
      },
      { root, rootMargin: '320px', threshold: 0 },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [filtered.length, registryPageCount])

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section className="flex min-h-[320px] min-w-0 flex-1 flex-col border-b border-[#252830] lg:min-h-0 lg:border-b-0 lg:border-r">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#252830] px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or description…"
            className="h-9 min-w-[12rem] flex-1 rounded-lg border border-[#2e323c] bg-[#13151a] px-3 text-sm outline-none ring-[#c4f542] placeholder:text-[#6d7178] focus:ring-1"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#8b9099]">
            <input
              type="checkbox"
              checked={installableOnly}
              onChange={(e) => setInstallableOnly(e.target.checked)}
              className="rounded border-[#2e323c] bg-[#13151a] text-[#c4f542] focus:ring-[#c4f542]"
            />
            Auto-installable only
          </label>
          <button
            type="button"
            onClick={() => registryQ.fetchNextPage()}
            disabled={!registryQ.hasNextPage || registryQ.isFetchingNextPage}
            className="h-9 shrink-0 rounded-lg bg-[#1b1d24] px-3 text-sm text-[#edeae3] ring-1 ring-[#2e323c] hover:bg-[#22252e] disabled:opacity-40"
            title="Uses registry API cursor pagination (metadata.nextCursor)"
          >
            {registryQ.isFetchingNextPage
              ? 'Loading…'
              : registryQ.hasNextPage
                ? `Load more · registry ${registryPageCount} page${registryPageCount === 1 ? '' : 's'}`
                : `End of registry · ${registryPageCount} page${registryPageCount === 1 ? '' : 's'}`}
          </button>
        </header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {registryQ.isError && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
              {(registryQ.error as Error).message}
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {filtered.map((row) => {
              const s = row.server
              const active = selected?.name === s.name && selected?.version === s.version
              const icon = s.icons?.[0]?.src
              return (
                <button
                  type="button"
                  key={catalogRowKey(row)}
                  onClick={() => onSelect(row)}
                  className={`group flex flex-col rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-[#c4f542]/45 bg-[#16181e]'
                      : 'border-[#252830] bg-[#13151a] hover:border-[#3a3f4d]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {icon ? (
                      <img src={icon} alt="" className="mt-0.5 h-9 w-9 rounded-md object-cover ring-1 ring-[#2e323c]" />
                    ) : (
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-[#1b1d24] text-xs font-semibold text-[#c4f542] ring-1 ring-[#2e323c]">
                        MCP
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#edeae3]">{s.title ?? s.name}</div>
                      <div className="truncate text-xs text-[#8b9099]">{s.name}</div>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#bfc3c9]">{s.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#6d7178]">
                    <span>v{s.version}</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {row._catalogLabel && (
                        <span className="rounded bg-[#1f2418] px-2 py-0.5 ring-1 ring-[#3d4a2a] text-[#c4f542]/90">
                          {row._catalogLabel}
                        </span>
                      )}
                      <span className="rounded bg-[#0f1013] px-2 py-0.5 ring-1 ring-[#2a2e38]">{transportLabel(s)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />
        </div>
      </section>

      <section className="flex max-h-[45vh] w-full shrink-0 flex-col border-t border-[#252830] bg-[#0f1013] lg:max-h-none lg:h-auto lg:w-[380px] lg:border-l lg:border-t-0">
        {!selected && (
          <div className="m-6 rounded-xl border border-dashed border-[#2e323c] p-6 text-sm text-[#8b9099]">
            Select a server to see details and install options.
          </div>
        )}
        {selected && <DetailPanel server={selected} onInstall={onInstall} />}
      </section>
    </div>
  )
}

function DetailPanel({ server, onInstall }: { server: RegistryServer; onInstall: () => void }) {
  const gate = discoverInstallGate(server)
  const icon = server.icons?.[0]?.src
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[#252830] p-5">
        <div className="flex gap-3">
          {icon ? (
            <img src={icon} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-[#2e323c]" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#13151a] text-sm font-semibold text-[#c4f542] ring-1 ring-[#2e323c]">
              MCP
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{server.title ?? server.name}</h2>
            <p className="truncate text-xs text-[#8b9099]">{server.name}</p>
            <p className="mt-1 text-xs text-[#6d7178]">Version {server.version}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#c8ccd3]">{server.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {server.repository?.url && (
            <a className="rounded-md bg-[#13151a] px-2 py-1 ring-1 ring-[#2e323c]" href={server.repository.url} target="_blank" rel="noreferrer">
              Repository
            </a>
          )}
          {server.websiteUrl && (
            <a className="rounded-md bg-[#13151a] px-2 py-1 ring-1 ring-[#2e323c]" href={server.websiteUrl} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 text-xs text-[#8b9099]">
        <div className="rounded-lg bg-[#13151a] p-3 font-mono text-[11px] leading-relaxed ring-1 ring-[#2e323c]">
          {JSON.stringify(server, null, 2)}
        </div>
      </div>
      <div className="border-t border-[#252830] p-4">
        {!gate.allowed && gate.blocker && (
          <p className="mb-3 text-xs leading-relaxed text-amber-100/90">{gate.blocker}</p>
        )}
        <button
          type="button"
          disabled={!gate.allowed}
          onClick={() => gate.allowed && onInstall()}
          className="h-10 w-full rounded-lg bg-[#c4f542] text-sm font-medium text-[#0c0d0f] hover:bg-[#d6ff5c] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Install…
        </button>
        <p className="mt-2 text-[10px] leading-snug text-[#6d7178]">
          MCP servers execute code on your machine (for example via npx or uvx). Only install sources you trust.
        </p>
      </div>
    </div>
  )
}

function InstallModal({
  server,
  onClose,
  onDone,
}: {
  server: RegistryServer
  onClose: () => void
  onDone: () => void
}) {
  const prefsQ = useQuery({ queryKey: ['prefs'], queryFn: () => window.mcpDock.getPrefs() })
  const enrichQ = useQuery({
    queryKey: ['enrich-catalog', server.name, server.version, server.websiteUrl ?? ''],
    queryFn: () => window.mcpDock.enrichMcpserversOrgServer(server),
    staleTime: 10 * 60 * 1000,
  })
  const effectiveServer = enrichQ.data ?? server
  const catalogEnrichPending =
    server.name.startsWith('mcpservers.org/servers/') || mayResolveViaGithubReadmeEnrich(server)
  const [client, setClient] = useState<McpClient>('cursor')
  const [serverKey, setServerKey] = useState(() => suggestServerKey(server.name))
  const { env: envFields, headers: headerFields } = useMemo(
    () => listRequiredInputs(effectiveServer),
    [effectiveServer],
  )
  const [env, setEnv] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const { env: ef } = listRequiredInputs(effectiveServer)
    const o: Record<string, string> = {}
    for (const e of ef) {
      if (e.default) o[e.name] = e.default
    }
    setEnv(o)
    setHeaders({})
  }, [effectiveServer])

  useEffect(() => {
    if (prefsQ.data?.defaultClient) setClient(prefsQ.data.defaultClient)
  }, [prefsQ.data?.defaultClient])

  const mut = useMutation({
    mutationFn: async () => {
      setErr(null)
      return window.mcpDock.install({ client, serverKey, server: effectiveServer, env, headers })
    },
    onSuccess: onDone,
    onError: (e: Error) => setErr(e.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[#2e323c] bg-[#13151a] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#252830] px-5 py-4">
          <div>
            <div className="text-base font-semibold">Install {server.title ?? server.name}</div>
            <div className="text-xs text-[#8b9099]">{server.name}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-[#8b9099] hover:bg-[#1b1d24]">
            Close
          </button>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          <label className="block">
            <span className="text-xs text-[#8b9099]">Target</span>
            <select
              value={client}
              onChange={(e) => setClient(e.target.value as McpClient)}
              className="mt-1 w-full rounded-lg border border-[#2e323c] bg-[#0f1013] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#c4f542]"
            >
              <option value="cursor">Cursor</option>
              <option value="claude">Claude Desktop</option>
              <option value="vscode">VS Code (user mcp.json)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#8b9099]">Server key</span>
            <input
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#2e323c] bg-[#0f1013] px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-[#c4f542]"
            />
          </label>
          {enrichQ.isFetching && (
            <p className="text-xs text-[#6d7178]">Resolving install hints from the catalog / GitHub…</p>
          )}
          {envFields.map((f) => (
            <label key={f.name} className="block">
              <span className="text-xs text-[#8b9099]">
                {f.name}
                {f.isRequired ? ' *' : ''}
              </span>
              {f.description && <span className="mt-0.5 block text-[11px] text-[#6d7178]">{f.description}</span>}
              <input
                type={f.isSecret ? 'password' : 'text'}
                value={env[f.name] ?? ''}
                onChange={(e) => setEnv((prev) => ({ ...prev, [f.name]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#2e323c] bg-[#0f1013] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#c4f542]"
              />
            </label>
          ))}
          {headerFields.map((h) => (
            <label key={h.name} className="block">
              <span className="text-xs text-[#8b9099]">
                Header: {h.name}
                {h.isRequired ? ' *' : ''}
              </span>
              {h.description && <span className="mt-0.5 block text-[11px] text-[#6d7178]">{h.description}</span>}
              <input
                type={h.isSecret ? 'password' : 'text'}
                value={headers[h.name] ?? ''}
                onChange={(e) => setHeaders((prev) => ({ ...prev, [h.name]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#2e323c] bg-[#0f1013] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#c4f542]"
              />
            </label>
          ))}
          {err && <div className="rounded-lg border border-red-900/40 bg-red-950/25 p-3 text-xs text-red-200">{err}</div>}
        </div>
        <div className="flex gap-2 border-t border-[#252830] px-5 py-4">
          <button
            type="button"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (catalogEnrichPending && enrichQ.isFetching)}
            className="h-10 flex-1 rounded-lg bg-[#c4f542] text-sm font-medium text-[#0c0d0f] hover:bg-[#d6ff5c] disabled:opacity-50"
          >
            {mut.isPending ? 'Writing config…' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InstalledPane() {
  const [client, setClient] = useState<McpClient>('cursor')
  const q = useQuery({
    queryKey: ['installed', client],
    queryFn: () => window.mcpDock.listInstalled(client),
  })
  const rm = useMutation({
    mutationFn: (key: string) => window.mcpDock.remove({ client, serverKey: key }),
    onSuccess: () => q.refetch(),
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#252830] px-4 py-3">
        <select
          value={client}
          onChange={(e) => setClient(e.target.value as McpClient)}
          className="h-9 rounded-lg border border-[#2e323c] bg-[#13151a] px-3 text-sm outline-none focus:ring-1 focus:ring-[#c4f542]"
        >
          <option value="cursor">Cursor</option>
          <option value="claude">Claude Desktop</option>
          <option value="vscode">VS Code</option>
        </select>
        <button
          type="button"
          onClick={() => window.mcpDock.revealConfig(client)}
          className="h-9 rounded-lg bg-[#1b1d24] px-3 text-sm ring-1 ring-[#2e323c] hover:bg-[#22252e]"
        >
          Reveal config in folder
        </button>
        <span className="ml-auto truncate text-xs text-[#6d7178]">{q.data?.path}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {q.isLoading && <div className="text-sm text-[#8b9099]">Reading config…</div>}
        {q.isError && <div className="text-sm text-red-300">{(q.error as Error).message}</div>}
        <ul className="space-y-2">
          {(q.data?.entries ?? []).map((e) => (
            <li key={e.key} className="flex items-center gap-3 rounded-xl border border-[#252830] bg-[#13151a] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{e.key}</div>
                <div className="truncate text-xs text-[#8b9099]">{e.summary}</div>
              </div>
              <button
                type="button"
                onClick={() => rm.mutate(e.key)}
                disabled={rm.isPending}
                className="h-8 shrink-0 rounded-lg bg-[#2a1f24] px-3 text-xs text-red-200 ring-1 ring-red-900/40 hover:bg-[#3a252b] disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {q.data && q.data.entries.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#2e323c] p-6 text-sm text-[#8b9099]">No servers in this config yet.</div>
        )}
      </div>
    </div>
  )
}

function SettingsPane() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['prefs'], queryFn: () => window.mcpDock.getPrefs() })
  const dp = useQuery({ queryKey: ['defaults'], queryFn: () => window.mcpDock.defaultPaths() })
  const [backupOnWrite, setBackupOnWrite] = useState(true)
  const [defaultClient, setDefaultClient] = useState<McpClient>('cursor')
  const [paths, setPaths] = useState<Partial<Record<McpClient, string>>>({})

  useEffect(() => {
    if (!q.data) return
    setBackupOnWrite(q.data.backupOnWrite)
    setDefaultClient(q.data.defaultClient)
    setPaths(q.data.pathOverrides ?? {})
  }, [q.data])

  const save = useMutation({
    mutationFn: () =>
      window.mcpDock.setPrefs({
        backupOnWrite,
        defaultClient,
        pathOverrides: {
          cursor: paths.cursor || undefined,
          claude: paths.claude || undefined,
          vscode: paths.vscode || undefined,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prefs'] })
    },
  })

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-[#8b9099]">Paths default to standard locations. Leave blank to auto-detect.</p>
      <div className="mt-6 space-y-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={backupOnWrite} onChange={(e) => setBackupOnWrite(e.target.checked)} />
          Create a timestamped backup before modifying a config file
        </label>
        <label className="block text-sm">
          <span className="text-xs text-[#8b9099]">Default install target</span>
          <select
            value={defaultClient}
            onChange={(e) => setDefaultClient(e.target.value as McpClient)}
            className="mt-1 w-full rounded-lg border border-[#2e323c] bg-[#13151a] px-3 py-2 outline-none focus:ring-1 focus:ring-[#c4f542]"
          >
            <option value="cursor">Cursor</option>
            <option value="claude">Claude Desktop</option>
            <option value="vscode">VS Code</option>
          </select>
        </label>
        {(['cursor', 'claude', 'vscode'] as const).map((c) => (
          <label key={c} className="block text-sm">
            <span className="text-xs text-[#8b9099]">{c} config path</span>
            <span className="mt-0.5 block text-[10px] text-[#6d7178]">Default: {dp.data?.[c] ?? '…'}</span>
            <input
              value={paths[c] ?? ''}
              onChange={(e) => setPaths((p) => ({ ...p, [c]: e.target.value }))}
              placeholder={dp.data?.[c] ?? ''}
              className="mt-1 w-full rounded-lg border border-[#2e323c] bg-[#13151a] px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-[#c4f542]"
            />
          </label>
        ))}

        <button
          type="button"
          onClick={() => save.mutate()}
          className="h-10 rounded-lg bg-[#c4f542] px-5 text-sm font-medium text-[#0c0d0f] hover:bg-[#d6ff5c]"
        >
          {save.isSuccess ? 'Saved' : save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
