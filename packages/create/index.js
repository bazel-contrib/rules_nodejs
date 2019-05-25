const fs = require('fs');
const path = require('path');

function main(args) {
  if (args.length < 1) {
    console.error(`Please specify the workspace directory:
        
        npx @bazel/create [workspace name]
        npm init @bazel [workspace name]
        yarn create @bazel [workspace name]
        `);
    return 1;
  }
  // FIXME: the workspace name should conform with Bazel rules
  const [wkspDir] = args;
  // TODO: user might want these to differ
  const wkspName = wkspDir;
  console.log(`Creating Bazel workspace ${wkspName}...`);
  fs.mkdirSync(wkspDir);

  function write(workspaceRelativePath, content) {
    fs.writeFileSync(
        path.join(wkspDir, workspaceRelativePath), content + require('os').EOL,
        {encoding: 'utf-8'});
  }

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

load("@build_bazel_rules_nodejs//:defs.bzl", "yarn_install")
yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

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
            devDependencies:
                {'@bazel/bazel': 'next', '@bazel/ibazel': 'latest', '@bazel/buildifier': 'latest'},
            scripts: {'build': 'bazel build //...', 'test': 'bazel test //...'}
          },
          null, 4));
  // in the published distribution, this file will appear in the same folder as this file
  if (fs.existsSync('common.bazelrc')) {
    write('.bazelrc', fs.readFileSync('common.bazelrc'))
  }
  // but running locally against sources, it's in the root of the repo two directories up
  if (fs.existsSync('../../common.bazelrc')) {
    write('.bazelrc', fs.readFileSync('../../common.bazelrc'));
  } else {
    console.error('ERROR: missing common.bazelrc file, continuing with no bazel settings...');
  }

  console.log(`Successfully created new Bazel workspace at ${path.resolve(wkspDir)}
    Inside that directory you can run yarn build or yarn test.`)
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}