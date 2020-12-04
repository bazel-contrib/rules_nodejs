const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const init = require('cypress/lib/cli').init;
const {join} = require('path');
const {readFileSync} = require('fs');

const [node, entry, configFilePath, pluginsFilePath, cypressTarPath, cypressBin, ...args] =
    process.argv;

const pluginsFile = runfiles.resolveWorkspaceRelative(pluginsFilePath).replace(process.cwd(), '.');
const configFile = runfiles.resolveWorkspaceRelative(configFilePath).replace(process.cwd(), '.');

async function invokeCypressWithCommand(command) {
  process.env.HOME = process.env['TEST_TMPDIR'];

  if (cypressTarPath) {
    const resolvedArchivePath = join(cypressTarPath.replace('external/', '../'));
    await untarCypress(resolvedArchivePath, join(process.env['TEST_TMPDIR']))
  }

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



function untarCypress(cypressTarPath, outputPath) {
  return new Promise((resolve, reject) => {
    const nodeModulesPath = join(
        process.cwd(), cypressBin.replace('external/', '../').split('node_modules')[0],
        'node_modules');

    const tar = require(require.resolve('tar', {
      unlink: true,
      paths: [
        join(nodeModulesPath, '@bazel', 'cypress', 'node_modules'),
        nodeModulesPath,
      ]
    }));


    tar.x(
        {
          cwd: outputPath,
          file: cypressTarPath,
          noMtime: true,
        },
        err => {
          if (err) {
            return reject(err);
          }

          try {
            const {cypressExecutable} =
                JSON.parse(readFileSync(join(outputPath, 'cypress-install', 'bazel_cypress.json')));

            process.env.CYPRESS_RUN_BINARY = join(outputPath, cypressExecutable);
            process.env.CYPRESS_CACHE_FOLDER = outputPath;
          } catch (err) {
            return reject(err)
          }

          return resolve();
        })
  });
}

async function main() {
  try {
    // Detect that we are running as a test, by using well-known environment
    // variables. See go/test-encyclopedia
    if (!process.env.BUILD_WORKSPACE_DIRECTORY) {
      await invokeCypressWithCommand('run');
    } else {
      await invokeCypressWithCommand('open');
    }
  } catch (e) {
    console.error(e);
    process.exit(1)
  }
}

main();