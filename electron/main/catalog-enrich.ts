import type { RegistryServer } from '../../shared/registry.js'
import { enrichGithubReadmeServerIfNeeded } from './github-readme-enrich.js'
import { enrichMcpserversOrgServerIfNeeded } from './mcpservers-enrich.js'

/** HTML directory rows: mcpservers.org detail page, then GitHub README / package.json for `github.com/o/r` stubs. */
export async function enrichCatalogListingIfNeeded(server: RegistryServer): Promise<RegistryServer> {
  let s = await enrichMcpserversOrgServerIfNeeded(server)
  s = await enrichGithubReadmeServerIfNeeded(s)
  return s
}
