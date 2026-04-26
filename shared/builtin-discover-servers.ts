/**
 * Curated servers always shown at the top of Discover (not from registry API or user catalog URLs).
 * Sourced from https://github.com/googleapis/gcloud-mcp — npm install shape matches upstream README.
 */

import type { RegistryListItem } from './registry.js'

const GCLOUD_MCP_REPO = 'https://github.com/googleapis/gcloud-mcp'

export const BUILTIN_DISCOVER_CATALOG_LABEL = 'MCP Dock picks'

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
