import * as vscode from 'vscode'
import { getMdcComponentCompletionItemProvider, getMdcComponentPropCompletionItemProvider } from './completion-providers'
import { getComponentMetadata } from './component-metadata'
import { ensureOutputChannel, logger } from './logger'

let outputChannel: vscode.OutputChannel | null = null

const mdcDocumentSelector: vscode.DocumentSelector = [
  { language: 'mdc', scheme: 'file' },
  { language: 'mdc', scheme: 'untitled' },
  { language: 'mdc', scheme: 'file', pattern: '**/.mdc' }
]

export function activate (context: vscode.ExtensionContext) {
  // Register MDC block component completion provider
  const mdcComponentCompletionProvider = vscode.languages.registerCompletionItemProvider(mdcDocumentSelector, {
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
  const mdcComponentPropsCompletionProvider = vscode.languages.registerCompletionItemProvider(mdcDocumentSelector, {
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

  try {
    // Initialize output channel
    outputChannel = ensureOutputChannel(outputChannel)
    context.subscriptions.push(outputChannel)

    logger('Activating MDC extension...', true)

    // Register show output command
    context.subscriptions.push(
      vscode.commands.registerCommand('mdc.showOutput', () => {
        ensureOutputChannel(outputChannel).show(true)
      })
    )

    // Register refresh metadata command
    context.subscriptions.push(
      vscode.commands.registerCommand('mdc.refreshMetadata', async () => {
        await getComponentMetadata(true)
      })
    )

    // Initial metadata fetch
    getComponentMetadata(true).then(() => {
      logger('Initial MDC component metadata fetch completed')

      context.subscriptions.push(
        mdcComponentCompletionProvider,
        mdcComponentPropsCompletionProvider
      )
    })
  } catch (error: any) {
    const errorMessage = `Error activating MDC extension: ${error.message}`
    if (outputChannel) {
      logger(errorMessage, true)
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
