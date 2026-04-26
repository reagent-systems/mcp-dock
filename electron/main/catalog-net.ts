/** Fetch catalog URLs from the main process (no browser CORS). */

export function assertCatalogFetchUrl(urlString: string): URL {
  let u: URL
  try {
    u = new URL(urlString)
  }
  catch {
    throw new Error('Invalid catalog URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:')
    throw new Error('Catalog URL must use http or https')
  return u
}

export async function fetchCatalogTextFromNetwork(urlString: string): Promise<string> {
  const u = assertCatalogFetchUrl(urlString)
  const res = await fetch(u.toString(), {
    redirect: 'follow',
    headers: {
      'User-Agent': 'MCP-Dock/electron (https://github.com/reagent-systems/mcp-dock)',
      Accept: '*/*',
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 240)}`)
  return text
}
