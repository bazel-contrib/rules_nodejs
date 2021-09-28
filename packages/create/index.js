#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];

function log_verbose(...m) {
  if (VERBOSE_LOGS) console.error('[@bazel/create]', ...m);
}

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
  From https://docs.bazel.build/versions/main/be/functions.html#workspace`);

  return false;
}

function usage(error) {
  error(`@bazel/create usage:

  Invoke it with any of these equivalent commands:
    npx  @bazel/create [workspace name] [options...]
    npm  init   @bazel [workspace name] [options...]
    yarn create @bazel [workspace name] [options...]

  Options:
    --packageManager=[yarn|npm]   Select npm or yarn to install packages
                                  (default: npm if you ran npm/npx, yarn if you ran yarn create)
    --typescript                  Set up the workspace for TypeScript development

  Run @bazel/create --help to see all options
  `);
}

function main(argv, error = console.error, log = console.log) {
  const args = require('minimist')(argv, {
    boolean: ['typescript'],
  });

  if (!args['_'] || args['_'].length < 1) {
    error('Please specify the workspace directory\n');
    usage(error);
    return 1;
  }

  if (args['help']) {
    usage(error);
    return 0;
  }

  // Which package manager will be used in the new project
  const pkgMgr = args['packageManager'] || detectRunningUnderYarn() ? 'yarn' : 'npm';

  log_verbose('Running with', process.argv);
  log_verbose('Environment', process.env);

  const [wkspDir] = args['_'];
  // TODO: user might want these to differ
  const wkspName = wkspDir;

  if (!validateWorkspaceName(wkspName, error)) {
    return 1;
  }

  log(`Creating Bazel workspace ${wkspName}...`);
  fs.mkdirSync(wkspDir);
  fs.mkdirSync(path.join(wkspDir, 'tools'));

  function write(workspaceRelativePath, content) {
    fs.writeFileSync(
        path.join(wkspDir, workspaceRelativePath), content + require('os').EOL,
        {encoding: 'utf-8'});
  }

  const devDependencies = {
    '@bazel/bazelisk': 'latest',
    '@bazel/ibazel': 'latest',
    '@bazel/buildifier': 'latest',
  };
  let rootBuildContent = '# Add rules here to build your software\n' +
      '# See https://docs.bazel.build/versions/main/build-ref.html#BUILD_files\n\n';

  if (args['typescript']) {
    devDependencies['@bazel/typescript'] = 'latest';
    devDependencies['typescript'] = 'latest';
    write('tsconfig.json', `\
{
    // If building without sandboxing, we need to prevent TypeScript from descending into
    // Bazel's external folder which contains third-party Bazel dependencies.
    "exclude": ["external/*"]
}`);
    rootBuildContent += '# Allow any ts_library rules in this workspace to reference the config\n' +
        '# Note: if you move the tsconfig.json file to a subdirectory, you can add an alias() here instead\n' +
        '#   so that ts_library rules still use it by default.\n' +
        '#   See https://www.npmjs.com/package/@bazel/typescript#installation\n' +
        'exports_files(["tsconfig.json"], visibility = ["//:__subpackages__"])\n';
  }

  write('BUILD.bazel', rootBuildContent);

  const yarnInstallCmd =
      `# The yarn_install rule runs yarn anytime the package.json or yarn.lock file changes.
# It also extracts and installs any Bazel rules distributed in an npm package.
load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")
yarn_install(
    # Name this npm so that Bazel Label references look like @npm//package
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)`;

  const npmInstallCmd =
      `# The npm_install rule runs yarn anytime the package.json or package-lock.json file changes.
# It also extracts any Bazel rules distributed in an npm package.
load("@build_bazel_rules_nodejs//:index.bzl", "npm_install")

npm_install(
    # Name this npm so that Bazel Label references look like @npm//package
    name = "npm",
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)`;

  let bazelDepsContent = `# Third-party dependencies fetched by Bazel
# Unlike WORKSPACE, the content of this file is unordered.
# We keep them separate to make the WORKSPACE file more maintainable.

# Install the nodejs "bootstrap" package
# This provides the basic tools for running and packaging nodejs programs in Bazel
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
def fetch_dependencies():
    http_archive(
        name = "build_bazel_rules_nodejs",
        sha256 = "3635797a96c7bfcd0d265dacd722a07335e64d6ded9834af8d3f1b7ba5a25bba",
        urls = ["https://github.com/bazelbuild/rules_nodejs/releases/download/4.3.0/rules_nodejs-4.3.0.tar.gz"],
    )`
  let workspaceContent = `# Bazel workspace created by @bazel/create 0.0.0-PLACEHOLDER

# Declares that this directory is the root of a Bazel workspace.
# See https://docs.bazel.build/versions/main/build-ref.html#workspace
workspace(
    # How this workspace would be referenced with absolute labels from another workspace
    name = "${wkspName}",
    # Map the @npm bazel workspace to the node_modules directory.
    # This lets Bazel use the same node_modules as other local tooling.
    managed_directories = {"@npm": ["node_modules"]},
)

load("//tools:bazel_deps.bzl", "fetch_dependencies")

fetch_dependencies()

${pkgMgr === 'yarn' ? yarnInstallCmd : npmInstallCmd}`;

  write('tools/BUILD.bazel', '# Currently there are no targets in this Bazel package')
  write('tools/bazel_deps.bzl', bazelDepsContent);
  // Don't name it WORKSPACE.bazel since there's a bug with managed_directories
  write('WORKSPACE', workspaceContent);
  write('.bazelignore', `\
# NB: semantics here are not the same as .gitignore
# see https://github.com/bazelbuild/bazel/issues/8106
# For example, every nested node_modules directory needs to be listed here.
node_modules
dist
bazel-out`);
  write(
      'package.json',
      JSON.stringify(
          {
            name: wkspName,
            version: '0.1.0',
            private: true,
            devDependencies,
            scripts: {
              'build': 'bazel build //...',
              'test': 'bazel test //...',
            }
          },
          null, 4));
  write('.gitignore', `\
.bazelrc.user
dist
bazel-out
node_modules`);
  // in the published distribution, this file will appear in the same folder as this file
  try {
    const rc = require.resolve('./common.bazelrc');
    write('.bazelrc', fs.readFileSync(rc));
    const version = require.resolve('./.bazelversion');
    write('.bazelversion', fs.readFileSync(version));
  } catch (_) {
    // but running locally against sources, it's in the root of the repo two directories up
    if (fs.existsSync('../../common.bazelrc')) {
      write('.bazelrc', fs.readFileSync('../../common.bazelrc'));
    } else {
      error('ERROR: missing common.bazelrc file, continuing with no bazel settings...');
    }
    write('.bazelversion', 'latest');
  }

  log(`Successfully created new Bazel workspace at ${path.resolve(wkspDir)}`);
  // TODO: we should probably run the package manager install now

  log(`Next steps:
  1. cd ${wkspDir}
  2. ${pkgMgr} install
  3. ${pkgMgr === 'yarn' ? 'yarn build' : 'npm run build'}
     Note that there is nothing to build, so this trivially succeeds.
  4. Add contents to the BUILD.bazel file or create a new BUILD.bazel in a subdirectory.
  `);

  return 0;
}

module.exports = {main};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
