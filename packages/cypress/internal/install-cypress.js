/**
 * install-cypress is responsible for creating an external repository from which a cypress_web_test
 * can be loaded. The script invokes `cypress install` to download and install the cypress binary
 * and subsequently calls cypress verify to ensure the binary is runnable.
 *
 * On macOS, cypress needs to create files and directories during its first run. This script also
 * run a hello world cypress tests so that cypress can create files and directories it will need at
 * runtime. During bazel test, the file system is readonly so we create these files within a
 * repository rule while the file system remains read/write.
 */

const {spawnSync} = require('child_process');
const {readdirSync, statSync, writeFileSync, mkdirSync, createWriteStream} = require('fs');
const {
  join,
  basename,
  relative,
  dirname,
} = require('path');

const nodePath = process.argv[1];
const cwd = process.cwd();
const cypressBin = process.argv[2];

const nodeModulesPath = join(cypressBin.split('node_modules')[0], 'node_modules');
const tar = require(require.resolve('tar', {
  paths: [
    join(nodeModulesPath, '@bazel', 'cypress', 'node_modules'),
    nodeModulesPath,
  ]
}));

async function installCypress() {
  mkdirSync(join(cwd, 'cypress-install'))

  const env = {
    CYPRESS_CACHE_FOLDER: join(cwd, 'cypress-install'),
    PATH: `${dirname(nodePath)}:${process.env.PATH}`,
    DEBUG: 'cypress:*'
  }

  const spawnOptions =
      {env, stdio: [process.stdin, process.stdout, process.stderr], shell: process.env.SHELL};

  const install = spawnSync(`${cypressBin}`, ['install'], spawnOptions);

  if (install.status !== 0) {
    throw new Error(`${cypressBin} install error: ${install.error}`)
  }

  function walkDir(dir, callback) {
    readdirSync(dir).forEach(f => {
      let dirPath = join(dir, f);
      let isDirectory = statSync(dirPath).isDirectory();
      isDirectory ? walkDir(dirPath, callback) : callback(join(dir, f));
    });
  };

  let CYPRESS_RUN_BINARY;
  walkDir(env.CYPRESS_CACHE_FOLDER, (filePath) => {
    if (basename(filePath) === 'Cypress') {
      if (CYPRESS_RUN_BINARY) {
        throw new Error(`More than one cypress executable found: ${CYPRESS_RUN_BINARY} ${filePath}`)
      }

      CYPRESS_RUN_BINARY = filePath;
    }
  });

  if (!CYPRESS_RUN_BINARY) {
    throw new Error(`No cypress executable found.`);
  }

  spawnOptions.env.CYPRESS_RUN_BINARY = CYPRESS_RUN_BINARY;

  const verify = spawnSync(cypressBin, ['verify'], spawnOptions);

  if (verify.status !== 0) {
    throw new Error(`cypress verify failed`);
  }

  writeFileSync(join(env.CYPRESS_CACHE_FOLDER, 'bazel_cypress.json'), JSON.stringify({
    cypressExecutable: relative(cwd, CYPRESS_RUN_BINARY),
  }));

  const cacheFiles = [];
  walkDir(env.CYPRESS_CACHE_FOLDER, (filePath) => {
    cacheFiles.push(relative(cwd, filePath));
  });

  const archiveName = 'cypress.archive';
  await createCypressArchive(cacheFiles, join(cwd, archiveName));

  writeFileSync('index.bzl', `load(
    "//:packages/cypress/internal/cypress_web_test.bzl",
    _cypress_web_test = "cypress_web_test",
)
cypress_web_test = _cypress_web_test`)
  writeFileSync('BUILD.bazel', `
package(default_visibility = ["//visibility:public"])

exports_files([
  "packages/cypress/internal/plugins/index.template.js",
  "packages/cypress/internal/plugins/base.js",
])

filegroup(
    name = "cypress_archive",
    srcs = ["${relative(cwd, archiveName)}"],
)
`.trim())
}

function createCypressArchive(cypressFiles, archiveName) {
  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(archiveName);

    tar.create({gzip: false, portable: true, noMtime: true, follow: true, mode: 777}, cypressFiles)
        .pipe(writeStream)
        .on('finish', (err) => {
          if (err) {
            return reject(err);
          }

          return resolve();
        })
  });
}

async function main() {
  await installCypress()
}

main()