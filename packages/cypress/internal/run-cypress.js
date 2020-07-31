const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const init = require('cypress/lib/cli').init;
const {join} = require('path');

const [node, entry, configFilePath, pluginsFilePath, cypressExecutable, ...args] = process.argv;

if (cypressExecutable) {
  process.env.CYPRESS_RUN_BINARY =
      join(process.cwd(), cypressExecutable.replace('external/', '../'));
  process.env.CYPRESS_CACHE_FOLDER =
      join(process.env.CYPRESS_RUN_BINARY.split('/cypress-cache/')[0], '/cypress-cache');
  process.env.HOME = process.env['TEST_TMPDIR'];
}

const pluginsFile = runfiles.resolveWorkspaceRelative(pluginsFilePath).replace(process.cwd(), '.');
const configFile = runfiles.resolveWorkspaceRelative(configFilePath).replace(process.cwd(), '.');

function invokeCypressWithCommand(command) {
  init([
    node,
    entry,
    command,
    '--config-file',
    configFile,
    '--config',
    `pluginsFile=${pluginsFile}`,
    ...args,
  ]);
}

// Detect that we are running as a test, by using well-known environment
// variables. See go/test-encyclopedia
if (!process.env.BUILD_WORKSPACE_DIRECTORY) {
  invokeCypressWithCommand('run');
} else {
  invokeCypressWithCommand('open');
}
