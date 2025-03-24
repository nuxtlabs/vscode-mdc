import * as vscode from 'vscode'
import { formatter, getDocumentFoldingRanges } from '@nuxtlabs/monarch-mdc'
import { getMdcComponentCompletionItemProvider, getMdcComponentPropCompletionItemProvider, createCacheCleanupListeners } from './completion-providers'
import { getComponentMetadata } from './component-metadata'
import { ensureOutputChannel, logger } from './logger'

let outputChannel: vscode.OutputChannel | null = null
let showOutputCommand: vscode.Disposable | null = null
let refreshMetadata: vscode.Disposable | null = null
let formatters: vscode.Disposable[] = []
let mdcComponentCompletionProvider: vscode.Disposable | null = null
let mdcComponentPropsCompletionProvider: vscode.Disposable | null = null

/**
 * Formats the entire document using the specified formatter and returns the text edits.
 *
 * @param {vscode.TextDocument} document - The document to format.
 * @param {boolean} isFormatOnType - Whether the formatter is being used for on-type formatting. Defaults to `false`.
 * @returns {vscode.TextEdit[]} - An array of `vscode.TextEdit` objects representing the formatting changes.
 *
 * @remarks
 * - Retrieves the tab size from the active editor's options, defaulting to 2 if not set.
 * - Formats the entire document text using the `formatter` function.
 * - Creates a full document replacement edit with the formatted text.
 */
function getDocumentFormatter (document: vscode.TextDocument, isFormatOnType: boolean = false): vscode.TextEdit[] {
  // Get tab size from active editor
  const activeEditor = vscode.window.activeTextEditor
  const tabSize = Number(activeEditor?.options.tabSize ?? 2)

  // Format the entire document
  const text = document.getText()
  const formatted = formatter(text, {
    tabSize,
    isFormatOnType
  })

  // Create a full document replacement edit
  const firstLine = document.lineAt(0)
  const lastLine = document.lineAt(document.lineCount - 1)
  const range = new vscode.Range(
    firstLine.range.start,
    lastLine.range.end
  )

  return [vscode.TextEdit.replace(range, formatted)]
}

/**
 * Provides folding ranges for a given markdown document.
 *
 * This function scans through the document to identify custom folding regions
 * defined by specific start and end tags (e.g., "::container" and "::").
 *
 * @param {vscode.TextDocument} document - The markdown document to provide folding ranges for.
 * @returns {vscode.FoldingRange[]} - An array of `vscode.FoldingRange` objects representing the folding regions.
 */
function provideFoldingRanges (document: vscode.TextDocument): vscode.FoldingRange[] {
  const documentAdapter = {
    getLine: (lineNumber: number) => document.lineAt(lineNumber).text,
    lineCount: document.lineCount
  }

  const ranges = getDocumentFoldingRanges(documentAdapter)

  return ranges.map(range =>
    new vscode.FoldingRange(range.start, range.end)
  )
}

const mdcDocumentSelector: vscode.DocumentSelector = [
  { language: 'mdc', scheme: 'file' },
  { language: 'mdc', scheme: 'untitled' },
  { language: 'mdc', scheme: 'file', pattern: '**/.mdc' }
]

export function activate (context: vscode.ExtensionContext) {
  try {
    // Initialize output channel
    outputChannel = ensureOutputChannel(outputChannel)
    context.subscriptions.push(outputChannel)

    logger('Activating MDC extension...')

    // Update any dynamic configuration settings
    function updateConfiguration () {
      // If already registered, dispose of existing command
      if (showOutputCommand) {
        showOutputCommand.dispose()
      }
      showOutputCommand = vscode.commands.registerCommand('mdc.showOutput', () => {
        ensureOutputChannel(outputChannel).show(true)
      })
      // Register show output command
      context.subscriptions.push(showOutputCommand)

      // Dispose component completion providers
      if (mdcComponentCompletionProvider) {
        mdcComponentCompletionProvider.dispose()
      }
      if (mdcComponentPropsCompletionProvider) {
        mdcComponentPropsCompletionProvider.dispose()
      }

      // Dispose existing formatters
      formatters.forEach(f => f.dispose())
      formatters = []

      // Retrieve the `mdc` configuration settings
      const config = vscode.workspace.getConfiguration('mdc')
      const formattingEnabled = config.get<boolean>('enableFormatting', false)
      const componentCompletionsEnabled = config.get<boolean>('enableComponentMetadataCompletions', false)

      if (formattingEnabled) {
        logger('Registering MDC formatters...')
        formatters = [
          // Register the document formatting provider
          vscode.languages.registerDocumentFormattingEditProvider(mdcDocumentSelector, {
            provideDocumentFormattingEdits: (document: vscode.TextDocument) => getDocumentFormatter(document, false)
          }),
          // Register the format on type provider
          vscode.languages.registerOnTypeFormattingEditProvider(
            mdcDocumentSelector,
            { provideOnTypeFormattingEdits: (document: vscode.TextDocument) => getDocumentFormatter(document, true) },
            '\n'
          )
        ]
        // Add formatters to subscriptions
        context.subscriptions.push(...formatters)
        logger('MDC formatters registered.')
      }

      if (componentCompletionsEnabled) {
        // Add cache cleanup listeners
        context.subscriptions.push(createCacheCleanupListeners())

        // Initialize component name and prop completion providers
        getComponentMetadata(true).then(() => {
          logger('Initial MDC component metadata fetch completed.')

          mdcComponentCompletionProvider = vscode.languages.registerCompletionItemProvider(mdcDocumentSelector, {
            provideCompletionItems: async (document, position) => {
              const mdcComponents = await getComponentMetadata()
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
          mdcComponentPropsCompletionProvider = vscode.languages.registerCompletionItemProvider(mdcDocumentSelector, {
            provideCompletionItems: async (document, position) => {
              const mdcComponents = await getComponentMetadata()
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

          // Add to subscriptions for cleanup on deactivate
          context.subscriptions.push(
            mdcComponentCompletionProvider,
            mdcComponentPropsCompletionProvider
          )

          // Dispose component metadata refresh command
          if (refreshMetadata) {
            refreshMetadata.dispose()
          }

          refreshMetadata = vscode.commands.registerCommand('mdc.refreshMetadata', async () => {
            await getComponentMetadata(true)
          })
          // Register refresh metadata command
          context.subscriptions.push(refreshMetadata)
        }).catch((error) => {
          const errorMessage = `MDC: Error fetching component metadata: ${error.message}`
          if (outputChannel) {
            logger(errorMessage, 'error')
          }
          vscode.window.showErrorMessage(errorMessage)
          throw error // Re-throw to ensure VS Code knows the action failed
        })
      }
    }

    logger('Registering MDC folding provider...')
    // Add static and config change subscriptions
    context.subscriptions.push(
      // Register folding range provider
      vscode.languages.registerFoldingRangeProvider(mdcDocumentSelector, { provideFoldingRanges })
    )
    logger('MDC folding provider registered.')

    // Register configuration change listener
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('mdc')) {
        updateConfiguration()
      }
    }))

    // Initial setup
    updateConfiguration()
  } catch (error: any) {
    const errorMessage = `MDC: Error activating extension: ${error.message}`
    if (outputChannel) {
      logger(errorMessage, 'error')
    }
    vscode.window.showErrorMessage(errorMessage)
    throw error // Re-throw to ensure VS Code knows activation failed
  }
}

function disposeProviders () {
  if (mdcComponentCompletionProvider) {
    mdcComponentCompletionProvider.dispose()
    mdcComponentCompletionProvider = null
  }
  if (mdcComponentPropsCompletionProvider) {
    mdcComponentPropsCompletionProvider.dispose()
    mdcComponentPropsCompletionProvider = null
  }
}

export function deactivate (): void {
  disposeProviders()
  if (outputChannel) {
    outputChannel.dispose()
  }
}
