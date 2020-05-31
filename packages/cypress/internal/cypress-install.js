/**
 * cypress-install is responsible for creating an external repository from which a cypress_web_test
 * can be loaded. The script invokes `cypress install` to download and install the cypress binary
 * and subsequently calls cypress verify to ensure the binary is runnable.
 *
 * On macOS, cypress needs to create files and directories during its first run. This script also
 * run a hello world cypress tests so that cypress can create files and directories it will need at
 * runtime. During bazel test, the file system is readonly so we create these files within a
 * repository rule while the file system remains read/write.
 */

const {spawnSync, spawn} = require('child_process');
const {readdirSync, statSync, writeFileSync, mkdirSync} = require('fs');
const {
  join,
  basename,
  relative,
  dirname,
} = require('path');
const nodePath = process.argv[1];
const cwd = process.cwd();
const cypressBin = process.argv[2];

// Sandboxing doesn't work on windows, so we can just use the global cypress cache.
if (process.platform === 'win32') {
  installGlobalCypressCache();
  process.exit(0);
}

// Attempt to install the cypress cache within the bazel sandbox and fallback to a global cypress
// cache as a last resort.
try {
  installSandboxedCypressCache()
} catch (e) {
  console.error('ERROR', e);
  installGlobalCypressCache();
}

function installGlobalCypressCache() {
  writeFileSync('BUILD.bazel', `package(default_visibility = ["//visibility:public"])
exports_files([
  "packages/cypress/internal/plugins/index.template.js",
  "packages/cypress/internal/plugins/base.js",
])`);
  writeFileSync('index.bzl', `load(
    "//:packages/cypress/internal/cypress_web_test.bzl",
    _cypress_web_test = "cypress_web_test_global_cache",
)
cypress_web_test = _cypress_web_test`)
  const spawnOptions = {
    stdio: [process.stdin, process.stdout, process.stderr],
    shell: process.env.SHELL
  };

  const install = spawnSync(`${cypressBin}`, ['install'], spawnOptions);
  if (install.status !== 0) {
    throw new Error('cypress install failed')
  }

  const verify = spawnSync(`${cypressBin}`, ['verify'], spawnOptions);

  if (verify.status !== 0) {
    throw new Error('cypress verify failed')
  }
}


function installSandboxedCypressCache() {
  mkdirSync(join(cwd, 'cypress-cache'))

  const env = {
    CYPRESS_CACHE_FOLDER: join(cwd, 'cypress-cache'),
    PATH: `${dirname(nodePath)}:${process.env.PATH}`,
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
  const cacheFiles = [];
  walkDir(env.CYPRESS_CACHE_FOLDER, (filePath) => {
    cacheFiles.push(filePath);
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

  const verify = spawnSync(`${cypressBin}`, ['verify'], spawnOptions);

  if (verify.status !== 0) {
    throw new Error(`cypress verify failed`);
  }

  writeFileSync('index.bzl', `load(
    "//:packages/cypress/internal/cypress_web_test.bzl",
    _cypress_web_test = "cypress_web_test",
)
cypress_web_test = _cypress_web_test`)
  writeFileSync(
      'BUILD.bazel',
      `
package(default_visibility = ["//visibility:public"])

exports_files([
  "packages/cypress/internal/plugins/index.template.js",
  "packages/cypress/internal/plugins/base.js",
])

filegroup(
    name = "cypress_cache",
    srcs = ${
          process.platform === 'darwin' ?
              // On mac we are required to include cache files including spaces. These can only be
              // included using a glob.
              'glob(["cypress-cache/**/*"]),' :
              // On unix the only no files containing spaces are required to run cypress.
              `      [
        ${
                  cacheFiles.filter(f => !f.includes(' '))
                      .map(f => `"${relative(cwd, f)}"`)
                      .join(',\n      ')}
    ]`}
)

filegroup(
    name = "cypress_executable",
    srcs = ["${relative(cwd, CYPRESS_RUN_BINARY)}"]
)
`.trim())


  // On mac, the first run of cypress requires write access to the filesystem.
  if (process.platform === 'darwin') {
    const http = require('http');
    const server = http.createServer((_request, response) => {
                         response.writeHead(200, {'Content-Type': 'text/html'});
                         response.write('<html><body>hello-world</body></html>\n');
                         response.end();
                       })
                       .listen(0, '127.0.0.1');
    server.on('listening', () => {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      writeFileSync(
          'cypress.json', JSON.stringify({baseUrl, 'integrationFolder': cwd, video: false}))
      writeFileSync('spec.js', `
    describe('hello', () => {
      it('should find hello', () => {
        cy.visit('${baseUrl}');
    
        cy.contains('hello');
      });
    });  
    `)


      spawn(
          `${cypressBin}`, ['run', '--config-file=cypress.json', '--headless', '--spec=spec.js'],
          spawnOptions)
          .on('exit', (code) => {
            server.close();

            if (code !== 0) {
              throw new Error('Failed to perform a dry-run of cypress')
            }
          })
    })
  }
}