import * as vscode from 'vscode'

let outputChannel: vscode.OutputChannel | null = null

/**
 * Ensures that the output channel exists, creating it if necessary.
 * The output channel is used for logging messages from the MDC (Markdown Components) extension.
 *
 * @returns {vscode.OutputChannel} The existing or newly created output channel
 * @singleton Maintains a single instance of the output channel
 */
export function ensureOutputChannel (_outputChannel?: vscode.OutputChannel | null): vscode.OutputChannel {
  if (!outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('MDC - Markdown Components')
    outputChannel = _outputChannel
  }
  return outputChannel
}

/**
 * Logs a message to the output channel if debug is enabled or force is true
 * @param message - The message to log
 * @param force - If true, shows the output channel and logs the message regardless of debug setting. Defaults to false.
 * @returns void
 */
export function logger (message: string, type: 'info' | 'error' = 'info', force = false): void {
  const channel = ensureOutputChannel()
  const config = vscode.workspace.getConfiguration('mdc')
  if (config.get('debug') || force) {
    const timestamp = new Date().toISOString()
    channel.appendLine(`${timestamp} [${type}]: ${message}`)
    if (force) {
      channel.show(true)
    }
  }
}
