/**
 * Simple node program to test that workspace creation works.
 * We don't use a test framework here since dependencies are awkward.
 */
const pkg = 'build_bazel_rules_nodejs/packages/create/npm_package';
const path = require('path');
const fs = require('fs');
const {main} = require(pkg);

function fail(...msg) {
  console.error('test failed');
  console.error(...msg);
  process.exitCode = 1;
}

let error, exitCode;
function captureError(...msg) {
  error = msg.join(' ');
}

exitCode = main([], captureError);
if (error.indexOf('specify the workspace directory') < 0) {
  fail('expected', error, 'to tell the user they missed an argument');
}
if (exitCode != 1) {
  fail('should exit 1 on error')
}

error = '';
exitCode = main(['has-hyphen'], captureError);
if (error.indexOf('not a valid Bazel workspace') < 0) {
  fail('should error when invalid workspace name');
}
if (exitCode != 1) {
  fail('should exit 1 on error')
}

process.chdir(process.env['TEST_TMPDIR']);
exitCode = main(['some_project'], captureError);
if (exitCode != 0) {
  fail('should exit 0 on success')
}
const projFiles = fs.readdirSync('some_project');
if (!projFiles.indexOf('.bazelrc') < 0) {
  fail('project should have .bazelrc');
}
const wkspContent = fs.readFileSync('some_project/WORKSPACE');
if (wkspContent.indexOf('npm_install') < 0) {
  fail('should use npm by default');
}
// TODO: run bazel in the new directory to verify a build works

process.env['_'] = '/usr/bin/yarn';
main(['default_to_yarn']);
if (fs.readFileSync('default_to_yarn/WORKSPACE').indexOf('yarn_install') < 0) {
  fail('should use yarn by default')
}
// TODO: run bazel in the new directory to verify a build works
