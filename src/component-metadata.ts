import * as vscode from 'vscode'
import { kebabCase } from 'scule'
import type { MDCComponentData } from './completion-providers'
import { logger } from './logger'

let metadataCache: MDCComponentData[] | null = null
let lastSuccessfulFile: string | null = null
let lastFetch = 0
const DEFAULT_CACHE_TTL_MINUTES = 60 // 1 hours

/**
 * Fetches metadata from a specified URL with optional force parameter.
 *
 * @param {string} url - The URL endpoint to fetch metadata from
 * @param {boolean} force - When true, displays VS Code information messages during fetch process. Defaults to false.
 * @returns A Promise that resolves to the fetched metadata object, or null if the fetch fails
 * @throws Will throw an error if the fetch response is not ok
 */
async function fetchRemoteComponentMetadata (url: string, force = false): Promise<MDCComponentData[] | null> {
  try {
    logger(`Fetching MDC component metadata from: ${url}`)
    vscode.window.showInformationMessage(`Fetching MDC component metadata from: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch MDC component metadata: ${response.statusText}`)
    }

    // Convert response to Uint8Array for consistency with file processing
    const data = new Uint8Array(await response.arrayBuffer())
    const metadata = processMetadataFile({
      metadataContent: data,
      filePath: url,
      force,
      source: 'remote'
    })

    if (metadata) {
      const message = `MDC component metadata fetched successfully (${metadata.length} components found).`
      vscode.window.showInformationMessage(message)
      const config = vscode.workspace.getConfiguration('mdc')
      if (config.get('debug')) {
        logger(message)
      }
    }

    return metadata
  } catch (error: any) {
    const errorMessage = `Error fetching metadata: ${error.message}`
    logger(errorMessage, 'error')
    vscode.window.showErrorMessage(errorMessage)
    return null
  }
}

interface ProcessMetadataOptions {
  /** The raw content of the metadata file */
  metadataContent: Uint8Array
  /** The path or URL of the metadata file being processed */
  filePath: string
  /** When true, displays VS Code information messages during processing */
  force?: boolean
  /** Indicates whether the content is from a local file or remote URL */
  source?: 'remote' | 'local'
}

/**
 * Processes a metadata file containing MDC component information.
 *
 * @param {ProcessMetadataOptions} options - Configuration options for processing metadata
 * @returns {MDCComponentData[]} An array of MDCComponentData objects sorted by component name, or null if processing fails.
 *
 * @description
 * This function performs the following steps:
 * 1. Decodes the file content from Uint8Array to text
 * 2. Extracts the default export object using regex
 * 3. Parses the JSON content
 * 4. Creates a map of component metadata, converting component names to kebab-case
 * 5. Sorts the components by name
 */
const processMetadataFile = ({
  metadataContent,
  filePath,
  source = 'local',
  force = false
}: ProcessMetadataOptions): MDCComponentData[] | null => {
  const config = vscode.workspace.getConfiguration('mdc')
  const textContent = new TextDecoder().decode(metadataContent)

  logger(`Processing ${source} metadata from: ${filePath}`)

  // Try parsing as direct JSON first
  try {
    const directContent = JSON.parse(textContent)
    if (Array.isArray(directContent) &&
      directContent.length > 0 &&
      'mdc_name' in directContent[0] &&
      'component_meta' in directContent[0] &&
      'meta' in directContent[0].component_meta) {
      const config = vscode.workspace.getConfiguration('mdc')
      if (config.get('debug')) {
        logger(`${directContent.length} components found (no data transformation needed).`)
      }
      return directContent
    }

    // If we got here, the JSON was valid but needs transformation
    logger('Valid JSON found, attempting data transformation...')

    // Try transforming the JSON content
    const componentsMap = new Map<string, MDCComponentData>()
    Object.values(directContent).forEach((componentMeta: any) => {
      const kebabCaseName = kebabCase(componentMeta.kebabName || componentMeta.pascalName)
      if (!componentsMap.has(kebabCaseName)) {
        componentsMap.set(kebabCaseName, {
          mdc_name: kebabCaseName,
          component_meta: componentMeta
        })
      }
    })

    // Sort the array of component metadata entries based on mdc_name.
    const metadata = Array.from(componentsMap.values()).sort((a, b) => a.mdc_name.localeCompare(b.mdc_name))

    if (config.get('debug')) {
      logger(`${metadata?.length} components found (transformed data format).`)
    }

    return metadata
  } catch (error) {
    // JSON parse failed, if this is a local file, try export pattern
    if (source === 'local') {
      logger('Direct JSON parse failed, checking for export pattern...')

      const match = textContent.match(/export\s+default\s+([{[][\s\S]*?\n[}\]])/m)
      if (match?.[1]) {
        try {
          return processMetadataFile({
            metadataContent: new TextEncoder().encode(match[1]),
            filePath,
            force,
            source: 'remote' // Treat exported content as if it were remote JSON
          })
        } catch (exportError) {
          logger('Export pattern processing failed.', 'error')
        }
      }
    }
  }

  logger(`Unable to process ${source} metadata content from: ${filePath}`, 'error')
  return null
}

/**
 * Attempts to find and load local component metadata from `.nuxt/component-meta.mjs` files in the current workspace or its subdirectories.
 */
async function fetchLocalComponentMetadata (force = false): Promise<MDCComponentData[] | null> {
  const config = vscode.workspace.getConfiguration('mdc')
  const metadataFilePattern = config.get<string>('componentMetadataLocalFilePattern', '**/.nuxt/component-meta.mjs')
  const metadataExcludeDirectoriesPattern = config.get<string>('componentMetadataLocalExcludePattern', '{**/node_modules/**,**/dist/**,**/.output/**,**/.cache/**,**/.playground/**}')

  try {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders?.length) {
      logger('No workspace folders found.')
      return null
    }

    // If we have a cached file path and this isn't a force refresh, try it first
    if (!force && lastSuccessfulFile) {
      try {
        const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(lastSuccessfulFile))
        const metadata = processMetadataFile({
          metadataContent: fileContent,
          filePath: lastSuccessfulFile,
          force,
          source: 'local'
        })
        if (metadata) {
          return metadata
        }
        // If processing failed, clear the cache and continue with full search
        lastSuccessfulFile = null
      } catch (error: any) {
        logger(`Cached file no longer accessible: ${error.message}`)
        lastSuccessfulFile = null
      }
    }

    // Full file search if needed
    const sourceFilePattern = new vscode.RelativePattern(workspaceFolders[0], metadataFilePattern)
    // Find files, excluding the provided directory patterns
    const files = await vscode.workspace.findFiles(sourceFilePattern, metadataExcludeDirectoriesPattern)
    if (!files.length) {
      logger('No files found.')
      return null
    }

    // Try each file until we find valid metadata
    for (const file of files) {
      logger(`Attempting to read metadata file: ${file.fsPath}`)
      try {
        const fileContent = await vscode.workspace.fs.readFile(file)
        const metadata = processMetadataFile({
          metadataContent: fileContent,
          filePath: file.fsPath,
          force,
          source: 'local'
        })
        if (metadata) {
          lastSuccessfulFile = file.fsPath
          return metadata
        }
      } catch (parseError) {
        logger(`Error parsing metadata from ${file.fsPath}: ${parseError}`, 'error')
        continue
      }
    }

    logger('No valid metadata found in available sources.')
    return null
  } catch (error: any) {
    logger(`Error loading local metadata: ${error.message}`, 'error')
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
  const componentCompletionsEnabled = config.get<boolean>('enableComponentMetadataCompletions', false)
  const componentMetadataCacheTTL: number = 60 * 1000 * Number(config.get<number>('componentMetadataCacheTTL') || DEFAULT_CACHE_TTL_MINUTES)
  const now = Date.now()

  // Check if we should skip fetching (not forced and within TTL)
  if (!force && lastFetch > 0 && (now - lastFetch) < componentMetadataCacheTTL) {
    if (metadataCache) {
      return metadataCache
    }
    return null
  }

  // If completions are disabled, update lastFetch and return
  if (!componentCompletionsEnabled) {
    const message = 'MDC component metadata suggestions are not enabled.'
    logger(message)
    vscode.window.showInformationMessage(message)
    lastFetch = now // Remember this check even if disabled
    return null
  }

  // Clear cache if forcing refresh
  if (force) {
    logger('Fetching MDC component metadata and clearing cache...')
    metadataCache = null
    lastFetch = 0
  }

  let metadata: MDCComponentData[] | null = null
  const componentMetadataURL = config.get<string>('componentMetadataURL')

  // If URL is configured, only use remote metadata
  if (componentMetadataURL) {
    logger('Attempting to fetch remote metadata...')
    metadata = await fetchRemoteComponentMetadata(componentMetadataURL, force)
  } else {
    // Only try local metadata if no URL is configured
    metadata = await fetchLocalComponentMetadata(force)
  }

  // Always update lastFetch after any attempt
  lastFetch = now

  if (metadata) {
    logger('Metadata fetch successful, updating cache.')
    metadataCache = metadata
    return metadata
  }

  return null
}
