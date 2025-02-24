import * as vscode from 'vscode'
import type { MDCComponentData } from './completion-providers'
import { logger } from './logger'

let metadataCache: any = null
let lastFetch = 0
const DEFAULT_CACHE_TTL_MINUTES = 360 // 6 hours

/**
 * Fetches metadata from a specified URL with optional force parameter.
 *
 * @param {string} url - The URL endpoint to fetch metadata from
 * @param {boolean} force - When true, displays VS Code information messages during fetch process. Defaults to false.
 * @returns A Promise that resolves to the fetched metadata object, or null if the fetch fails
 * @throws Will throw an error if the fetch response is not ok
 */
async function fetchMetadata (url: string, force = false): Promise<MDCComponentData[] | null> {
  try {
    logger(`Fetching MDC component metadata from: ${url}`, force)
    if (force) {
      vscode.window.showInformationMessage(`Fetching MDC component metadata from: ${url}`)
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch MDC component metadata: ${response.statusText}`)
    }

    const data = await response.json()
    logger('MDC component metadata fetched successfully', force)
    logger(JSON.stringify(data, null, 2))

    if (force) {
      vscode.window.showInformationMessage('MDC component metadata fetched successfully')
    }
    return data as MDCComponentData[]
  } catch (error: any) {
    const errorMessage = `Error fetching metadata: ${error.message}`
    logger(errorMessage, true)
    vscode.window.showErrorMessage(errorMessage)
    return null
  }
}

/**
 * Retrieves metadata from a configured URL with caching support.
 * @param {boolean} force - When true, bypasses cache and forces a new fetch. Defaults to false.
 * @returns {Promise<MDCComponentData[]>} Promise resolving to metadata object, or null if URL is not configured or fetch fails
 * @throws {Error} Potentially throws if network request fails
 *
 * The function will:
 * - Check configuration for metadata URL and cache TTL
 * - Show warning if force=true but URL not configured
 * - Return cached data if within TTL period
 * - Fetch new data if cache expired or force=true
 * - Update cache with new data if fetch successful
 */
export async function getComponentMetadata (force = false): Promise<MDCComponentData[] | null> {
  const config = vscode.workspace.getConfiguration('mdc')
  const componentMetadataURL = config.get<string>('componentMetadataURL')
  // TTL in minutes
  const componentMetadataCacheTTL: number = 60 * 1000 * Number(config.get<number>('componentMetadataCacheTTL') || DEFAULT_CACHE_TTL_MINUTES)

  if (force && !componentMetadataURL) {
    const message = 'MDC component suggestions are not enabled. Please set mdc.componentMetadataURL in settings to configure your completion provider.'
    logger(message, true)
    vscode.window.showInformationMessage(message)
    return null
  }

  if (!componentMetadataURL) {
    return null
  }

  const now = Date.now()
  if (!force && metadataCache && (now - lastFetch) < componentMetadataCacheTTL) {
    logger('Using cached MDC component metadata')
    return metadataCache
  }

  const metadata = await fetchMetadata(componentMetadataURL, force)
  if (metadata) {
    metadataCache = metadata
    lastFetch = now
  }
  return metadata
}
