const semver = require('semver')
if (!semver.patched) {
  console.error('Expected semver to be patched');
  process.exitCode = 1;
}

const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const packageJson = require(runfiles.resolve('internal_npm_install_test_patches_yarn/_/internal/npm_install/test/patches_yarn/package.json'))
if (packageJson.dependencies.__other_invalid_dependency__) {
  console.error('expected package.json __other_invalid_dependency__ to have been removed');
  process.exitCode = 1;
}
if (packageJson.version != '1.0.0') {
  console.error('expected package.json version to be 1.0.0');
  process.exitCode = 1;
}
if (packageJson.scripts.replace_me != 'replaced') {
  console.error('expected package.json scripts.replace_me to be replaced');
  process.exitCode = 1;
}
if (packageJson.scripts.new != 'added') {
  console.error('expected package.json scripts.new to be added');
  process.exitCode = 1;
}
