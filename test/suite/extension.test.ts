import * as assert from 'assert';
import * as vscode from 'vscode';

async function activateMdcLanguage() {
  const doc = await vscode.workspace.openTextDocument({ language: 'mdc', content: '' });
  await vscode.window.showTextDocument(doc);
}

suite('MDC Extension Test Suite', () => {
  test('Extension should be present', async () => {
    await activateMdcLanguage();
    const ext = vscode.extensions.getExtension('nuxt.mdc');
    assert.ok(ext, 'Extension nuxt.mdc should be present');
    await ext?.activate();
  });

  test('mdc language should be registered', async () => {
    await activateMdcLanguage();
    const ext = vscode.extensions.getExtension('nuxt.mdc');
    await ext?.activate();
    const languages = await vscode.languages.getLanguages();
    assert.ok(languages.includes('mdc'), 'mdc language should be registered');
  });

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
  });
}); 