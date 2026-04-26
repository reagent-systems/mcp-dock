/** Primary MCP Registry servers listing (paginated `…/v0/servers`). */
export const OFFICIAL_REGISTRY_SERVERS_URL = 'https://registry.modelcontextprotocol.io/v0/servers'

/** Registry API returns 422 if `limit` is above 100. */
export const REGISTRY_SERVERS_PAGE_SIZE = 100

/** On Discover, automatically follow `metadata.nextCursor` this many times after the first page. */
export const REGISTRY_BOOTSTRAP_PAGE_COUNT = 3
