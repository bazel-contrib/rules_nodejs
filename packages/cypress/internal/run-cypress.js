const init = require('cypress/lib/cli').init;
const {join} = require('path');

const [node, entry, configFilePath, pluginsFilePath, cypressBin, ...args] = process.argv;

async function invokeCypressWithCommand(command) {
  process.env.HOME = process.env['TEST_TMPDIR'];

  // NOTE: Use join since cypressBin is a relative path.
  process.env.CYPRESS_RUN_BINARY = join(process.cwd(), cypressBin);

  init([
    node,
    entry,
    command,
    `--config-file=${configFilePath}`,
    `--config=pluginsFile=${pluginsFilePath}`,
    ...args,
  ]);
}

async function main() {
  try {
    // Detect that we are running as a test, by using well-known environment
    // variables. See go/test-encyclopedia
    if (!process.env.BUILD_WORKSPACE_DIRECTORY) {
      await invokeCypressWithCommand('run-ct');
    } else {
      await invokeCypressWithCommand('open-ct');
    }
  } catch (e) {
    console.error(e);
    process.exit(1)
  }
}

main();