import * as path from 'path';
import * as cp from 'child_process';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests
} from '@vscode/test-electron';

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
    const vsixPath = path.resolve(__dirname, '../../../mdc-0.3.3.vsix');
    const vscodeExecutablePath = await downloadAndUnzipVSCode();
    const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // Install the VSIX extension
    cp.spawnSync(
      cliPath,
      [...args, '--install-extension', vsixPath],
      {
        encoding: 'utf-8',
        stdio: 'inherit'
      }
    );

    // Run the extension test
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main(); 