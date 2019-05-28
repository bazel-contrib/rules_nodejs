#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const DEBUG = !!process.env['DEBUG'];

/**
 * Detect if the user ran `yarn create @bazel` so we can default
 * to using yarn in the new workspace.
 *
 * TODO: check whether it detects properly on Windows
 */
function detectRunningUnderYarn() {
  const executable = process.argv[1];
  if (!!executable && executable.indexOf('yarn/bin') >= 0) {
    return true;
  }
  if (process.env['_'] && process.env['_'].endsWith('yarn')) {
    return true;
  }
  return false;
}

function validateWorkspaceName(name, error) {
  if (/^[_a-zA-Z0-9]+$/.test(name)) {
    return true;
  }
  error(`ERROR: ${name} is not a valid Bazel workspace name.
  
  A workspace name must start with a letter and can contain letters, numbers, and underscores
  (this is to maximize the number of languages for which this string can be a valid package/module name).
  It should describe the project in reverse-DNS form, with elements separated by underscores.
  For example, if a project is hosted at example.com/some-project,
  you might use com_example_some_project as the workspace name.
  From https://docs.bazel.build/versions/master/be/functions.html#workspace`);
  return false;
}
function main(args, error = console.error, log = console.log) {
  if (!args || args.length < 1) {
    error(`Please specify the workspace directory:
        
        npx @bazel/create [workspace name]
        npm init @bazel [workspace name]
        yarn create @bazel [workspace name]
        `);
    return 1;
  }

  // Which package manager will be used in the new project
  // TODO: make it a command line arg
  // but don't make yargs a transitive dep because of global install
  const pkgMgr = detectRunningUnderYarn() ? 'yarn' : 'npm';

  if (DEBUG) {
    log('Running with', process.argv);
    log('Environment', process.env);
  }

  const [wkspDir] = args;
  // TODO: user might want these to differ
  const wkspName = wkspDir;

  if (!validateWorkspaceName(wkspName, error)) {
    return 1;
  }

  log(`Creating Bazel workspace ${wkspName}...`);
  fs.mkdirSync(wkspDir);

  function write(workspaceRelativePath, content) {
    fs.writeFileSync(
        path.join(wkspDir, workspaceRelativePath), content + require('os').EOL,
        {encoding: 'utf-8'});
  }

  const yarnInstallCmd = `load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install")
yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)`;

  const npmInstallCmd = `load("@build_bazel_rules_nodejs//:defs.bzl", "npm_install")
npm_install(
    name = "npm",
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)`;

  write('WORKSPACE', `# Bazel workspace created by @bazel/create

# Declares that this directory is the root of a Bazel workspace.
# See https://docs.bazel.build/versions/master/build-ref.html#workspace
workspace(
    # How this workspace would be referenced with absolute labels from another workspace
    name = "${wkspName}",
    managed_directories = {"@npm": ["node_modules"]},
)

# Install the nodejs "bootstrap" package
# 
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "abcf497e89cfc1d09132adfcd8c07526d026e162ae2cb681dcb896046417ce91",
    urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/0.30.1/rules_nodejs-0.30.1.tar.gz"],
)

${pkgMgr === 'yarn' ? yarnInstallCmd : npmInstallCmd}

load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")
install_bazel_dependencies()`);
  write('BUILD.bazel', `# Add rules here to build your software
# See https://docs.bazel.build/versions/master/build-ref.html#BUILD_files`);
  write('.bazelignore', `node_modules`);
  write(
      'package.json',
      JSON.stringify(
          {
            name: wkspName,
            version: '0.1.0',
            private: true,
            devDependencies: {
              '@bazel/bazel': 'latest',
              '@bazel/ibazel': 'latest',
              '@bazel/buildifier': 'latest',
            },
            scripts: {
              'build': 'bazel build //...',
              'test': 'bazel test //...',
            }
          },
          null, 4));
  // in the published distribution, this file will appear in the same folder as this file
  try {
    const rc = require.resolve('./common.bazelrc');
    write('.bazelrc', fs.readFileSync(rc));
  } catch (_) {
    // but running locally against sources, it's in the root of the repo two directories up
    if (fs.existsSync('../../common.bazelrc')) {
      write('.bazelrc', fs.readFileSync('../../common.bazelrc'));
    } else {
      error('ERROR: missing common.bazelrc file, continuing with no bazel settings...');
    }
  }

  log(`Successfully created new Bazel workspace at ${path.resolve(wkspDir)}`);
  // TODO: we should probably run the package manager install now
  if (pkgMgr === 'yarn') {
    log(`Now in that directory, you can run
    yarn install
    yarn build
    yarn test`);
  } else {
    log(`Now in that directory, you can run
    npm install
    npm run build
    npm test`);
  }

  return 0;
}

module.exports = {main};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}