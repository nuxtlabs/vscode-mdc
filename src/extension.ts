import * as vscode from 'vscode'
import { getMdcComponentCompletionItemProvider, getMdcComponentPropCompletionItemProvider } from './completion-providers'
import type { MDCComponentData } from './completion-providers'

let outputChannel: vscode.OutputChannel | null = null
let metadataCache: any = null
let lastFetch = 0
const DEFAULT_CACHE_TTL_MINUTES = 360 // 6 hours

const mdcDocumentSelector: vscode.DocumentSelector = [
  { language: 'mdc', scheme: 'file' },
  { language: 'mdc', scheme: 'untitled' },
  { language: 'mdc', scheme: 'file', pattern: '**/.mdc' }
]

/**
 * Ensures that the output channel exists, creating it if necessary.
 * The output channel is used for logging messages from the MDC (Markdown Components) extension.
 *
 * @returns {vscode.OutputChannel} The existing or newly created output channel
 * @singleton Maintains a single instance of the output channel
 */
function ensureOutputChannel (): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('MDC - Markdown Components')
  }
  return outputChannel
}

/**
 * Logs a message to the output channel if debug is enabled or force is true
 * @param message - The message to log
 * @param force - If true, shows the output channel and logs the message regardless of debug setting. Defaults to false.
 * @returns void
 */
function log (message: string, force = false): void {
  const channel = ensureOutputChannel()
  const config = vscode.workspace.getConfiguration('mdc')
  if (config.get('debug') || force) {
    const timestamp = new Date().toISOString()
    channel.appendLine(`[${timestamp}] ${message}`)
    if (force) {
      channel.show(true)
    }
  }
}

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
    log(`Fetching MDC component metadata from: ${url}`, force)
    if (force) {
      vscode.window.showInformationMessage(`Fetching MDC component metadata from: ${url}`)
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch MDC component metadata: ${response.statusText}`)
    }

    const data = await response.json()
    log('MDC component metadata fetched successfully', force)
    log(JSON.stringify(data, null, 2))

    if (force) {
      vscode.window.showInformationMessage('MDC component metadata fetched successfully')
    }
    return data as MDCComponentData[]
  } catch (error: any) {
    const errorMessage = `Error fetching metadata: ${error.message}`
    log(errorMessage, true)
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
async function getMetadata (force = false): Promise<MDCComponentData[] | null> {
  const config = vscode.workspace.getConfiguration('mdc')
  const componentMetadataURL = config.get<string>('componentMetadataURL')
  // TTL in minutes
  const componentMetadataCacheTTL: number = 60 * 1000 * Number(config.get<number>('componentMetadataCacheTTL') || DEFAULT_CACHE_TTL_MINUTES)

  if (force && !componentMetadataURL) {
    const message = 'MDC component suggestions are not enabled. Please set mdc.componentMetadataURL in settings to configure your completion provider.'
    log(message, true)
    vscode.window.showInformationMessage(message)
    return null
  }

  if (!componentMetadataURL) {
    return null
  }

  const now = Date.now()
  if (!force && metadataCache && (now - lastFetch) < componentMetadataCacheTTL) {
    log('Using cached MDC component metadata')
    return metadataCache
  }

  const metadata = await fetchMetadata(componentMetadataURL, force)
  if (metadata) {
    metadataCache = metadata
    lastFetch = now
  }
  return metadata
}

export function activate (context: vscode.ExtensionContext) {
  // Register MDC block component completion provider
  const mdcComponentCompletionProvider = vscode.languages.registerCompletionItemProvider(mdcDocumentSelector, {
    provideCompletionItems: async (document, position) => {
      const mdcComponents = await getMetadata()
      // If no components, exit early
      if (!mdcComponents || !mdcComponents?.length) {
        return
      }
      return getMdcComponentCompletionItemProvider(mdcComponents, { document, position })
    }
  },
  ':' // Trigger on colon
  )

  // Register MDC block component completion provider
  const mdcComponentPropsCompletionProvider = vscode.languages.registerCompletionItemProvider(mdcDocumentSelector, {
    provideCompletionItems: async (document, position) => {
      const mdcComponents = await getMetadata()
      // If no components, exit early
      if (!mdcComponents || !mdcComponents?.length) {
        return
      }
      return getMdcComponentPropCompletionItemProvider(mdcComponents, { document, position })
    }
  },
  '\n', // Trigger newline
  ' ' // Trigger on space character
  )

  try {
    // Initialize output channel
    outputChannel = ensureOutputChannel()
    context.subscriptions.push(outputChannel)

    log('Activating MDC extension...', true)

    // Register show output command
    context.subscriptions.push(
      vscode.commands.registerCommand('mdc.showOutput', () => {
        ensureOutputChannel().show(true)
      })
    )

    // Register refresh metadata command
    context.subscriptions.push(
      vscode.commands.registerCommand('mdc.refreshMetadata', async () => {
        await getMetadata(true)
      })
    )

    // Initial metadata fetch
    getMetadata(true).then(() => {
      log('Initial MDC component metadata fetch completed')

      context.subscriptions.push(
        mdcComponentCompletionProvider,
        mdcComponentPropsCompletionProvider
      )
    })
  } catch (error: any) {
    const errorMessage = `Error activating MDC extension: ${error.message}`
    if (outputChannel) {
      log(errorMessage, true)
    }
    vscode.window.showErrorMessage(errorMessage)
    throw error // Re-throw to ensure VS Code knows activation failed
  }
}

export function deactivate (): void {
  if (outputChannel) {
    outputChannel.dispose()
  }
}
