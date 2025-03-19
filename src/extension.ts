import * as vscode from 'vscode'
import { formatter, getDocumentFoldingRanges } from '@nuxtlabs/monarch-mdc'
import { getMdcComponentCompletionItemProvider, getMdcComponentPropCompletionItemProvider } from './completion-providers'
import { getComponentMetadata } from './component-metadata'
import { ensureOutputChannel, logger } from './logger'

const outputChannel: vscode.OutputChannel | null = null

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
  let formatters: vscode.Disposable[] = []

  // Update any dynamic configuration settings
  function updateConfiguration () {
    // Dispose existing formatters
    formatters.forEach(f => f.dispose())
    formatters = []

    // Retrieve the `mdc` configuration settings
    const config = vscode.workspace.getConfiguration('mdc')
    const formattingEnabled = config.get<boolean>('enableFormatting', false)

    if (formattingEnabled) {
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
    }
  }

  // Add static and config change subscriptions
  context.subscriptions.push(
    // Register folding range provider
    vscode.languages.registerFoldingRangeProvider(mdcDocumentSelector, { provideFoldingRanges }),
    // Register configuration change listener
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('mdc')) {
        updateConfiguration()
      }
    })
  )

  // Initial setup
  updateConfiguration()
}
