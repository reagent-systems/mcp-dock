/**
 * Curated servers always shown at the top of Discover (not from registry API or user catalog URLs).
 * Google Cloud: https://github.com/googleapis/gcloud-mcp — npm install shape matches upstream README.
 * Others: remote Streamable HTTP URLs from publisher docs, or npm stdio where documented.
 */

import type { RegistryListItem } from './registry.js'

const GCLOUD_MCP_REPO = 'https://github.com/googleapis/gcloud-mcp'
const X_MCP_DOCS_URL = 'https://docs.x.com/tools/mcp'
const XMCP_REPO = 'https://github.com/xdevplatform/xmcp'
const VERCEL_MCP_DOCS_URL = 'https://vercel.com/docs/agent-resources/vercel-mcp'
const STRIPE_MCP_DOCS_URL = 'https://docs.stripe.com/mcp'
const SUPABASE_MCP_DOCS_URL = 'https://supabase.com/docs/guides/getting-started/mcp'
const SUPABASE_MCP_REPO = 'https://github.com/supabase-community/supabase-mcp'
const NOTION_MCP_REPO = 'https://github.com/makenotion/notion-mcp-server'

export const BUILTIN_DISCOVER_CATALOG_LABEL = 'MCP Dock picks'

function builtinRemoteRow(
  name: string,
  title: string,
  description: string,
  remoteUrl: string,
  websiteUrl: string,
  repositoryUrl?: string,
): RegistryListItem {
  return {
    server: {
      name,
      title,
      description,
      version: 'latest',
      websiteUrl,
      ...(repositoryUrl ? { repository: { url: repositoryUrl, source: 'github' } } : {}),
      remotes: [{ type: 'streamable-http', url: remoteUrl }],
    },
    _catalogLabel: BUILTIN_DISCOVER_CATALOG_LABEL,
  }
}

function builtinGoogleCloudRow(
  id: string,
  title: string,
  description: string,
  npmIdentifier: string,
): RegistryListItem {
  return {
    server: {
      name: `google-cloud/${id}`,
      title,
      description,
      version: 'latest',
      websiteUrl: GCLOUD_MCP_REPO,
      repository: { url: GCLOUD_MCP_REPO, source: 'github' },
      packages: [
        {
          registryType: 'npm',
          identifier: npmIdentifier,
          version: 'latest',
          transport: { type: 'stdio' },
        },
      ],
    },
    _catalogLabel: BUILTIN_DISCOVER_CATALOG_LABEL,
  }
}

/** Google Cloud MCP packages published from googleapis/gcloud-mcp (see README table). */
export const builtinDiscoverServers: RegistryListItem[] = [
  builtinRemoteRow(
    'x-developers/docs-mcp',
    'X API Docs MCP',
    'Search and read X API documentation from your AI client (hosted Streamable HTTP endpoint).',
    'https://docs.x.com/mcp',
    X_MCP_DOCS_URL,
  ),
  builtinRemoteRow(
    'x-developers/xmcp',
    'XMCP (X API tools)',
    'Official MCP server that exposes X API v2 operations as tools. Run the Python server locally, then connect — see the repo README.',
    'http://127.0.0.1:8000/mcp',
    X_MCP_DOCS_URL,
    XMCP_REPO,
  ),
  builtinRemoteRow(
    'vercel/mcp',
    'Vercel MCP',
    'Official remote MCP for Vercel: docs search, projects, deployments, and logs (OAuth). Point your client at this URL and authorize when prompted.',
    'https://mcp.vercel.com',
    VERCEL_MCP_DOCS_URL,
  ),
  builtinRemoteRow(
    'stripe/mcp',
    'Stripe MCP',
    'Stripe API tools and knowledge-base search from your AI client (OAuth by default; optional Bearer restricted keys — see Stripe docs).',
    'https://mcp.stripe.com',
    STRIPE_MCP_DOCS_URL,
  ),
  builtinRemoteRow(
    'supabase/mcp',
    'Supabase MCP',
    'Hosted MCP for Supabase projects: database, logs, Edge Functions, docs search, and more. Complete OAuth in the browser when your client prompts you.',
    'https://mcp.supabase.com/mcp',
    SUPABASE_MCP_DOCS_URL,
    SUPABASE_MCP_REPO,
  ),
  {
    server: {
      name: 'notionhq/notion-mcp-server',
      title: 'Notion MCP Server',
      description:
        'Local stdio MCP for the Notion API (`@notionhq/notion-mcp-server`). Use NOTION_TOKEN from an internal integration at notion.so/profile/integrations.',
      version: 'latest',
      websiteUrl: NOTION_MCP_REPO,
      repository: { url: NOTION_MCP_REPO, source: 'github' },
      packages: [
        {
          registryType: 'npm',
          identifier: '@notionhq/notion-mcp-server',
          version: 'latest',
          transport: { type: 'stdio' },
          environmentVariables: [
            {
              name: 'NOTION_TOKEN',
              description: 'Internal integration secret from your integration’s Configuration tab.',
              isRequired: true,
              isSecret: true,
            },
          ],
        },
      ],
    },
    _catalogLabel: BUILTIN_DISCOVER_CATALOG_LABEL,
  },
  builtinGoogleCloudRow(
    'gcloud',
    'Google Cloud (gcloud CLI)',
    'Interact with Google Cloud via the gcloud CLI using natural language prompts.',
    '@google-cloud/gcloud-mcp',
  ),
  builtinGoogleCloudRow(
    'observability',
    'Google Cloud Observability',
    'Access Google Cloud Observability APIs to query logs, metrics, and traces.',
    '@google-cloud/observability-mcp',
  ),
  builtinGoogleCloudRow(
    'storage',
    'Google Cloud Storage',
    'Interact with Google Cloud Storage for bucket and object management.',
    '@google-cloud/storage-mcp',
  ),
  builtinGoogleCloudRow(
    'backupdr',
    'Google Cloud Backup and DR',
    'Interact with Google Cloud Backup and Disaster Recovery.',
    '@google-cloud/backupdr-mcp',
  ),
]
