/**
 * Simple node program to test that workspace creation works.
 * We don't use a test framework here since dependencies are awkward.
 */
const pkg = 'build_bazel_rules_nodejs/packages/create/npm_package';
const path = require('path');
const fs = require('fs');
const {main} = require(pkg);

function fail(...msg) {
  console.error(...msg);
  throw new Error('test failed');
}

let error, exitCode;
function captureError(...msg) {
  error = error + '\n' + msg.join(' ');
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
let wkspContent = fs.readFileSync('some_project/WORKSPACE', {encoding: 'utf-8'});
if (wkspContent.indexOf('npm_install(') < 0) {
  fail('should use npm by default');
}
// TODO: run bazel in the new directory to verify a build works

exitCode = main(['configure_pkgMgr', '--packageManager=yarn'], captureError);
if (exitCode != 0) fail('should be success');
wkspContent = fs.readFileSync('configure_pkgMgr/WORKSPACE', {encoding: 'utf-8'});
if (wkspContent.indexOf('yarn_install(') < 0) {
  fail('should use yarn when requested');
}

process.env['_'] = '/usr/bin/yarn';
exitCode = main(['default_to_yarn']);
if (exitCode != 0) fail('should be success');
wkspContent = fs.readFileSync('default_to_yarn/WORKSPACE', {encoding: 'utf-8'});
if (wkspContent.indexOf('yarn_install(') < 0) {
  fail('should use yarn by default')
}
// TODO: run bazel in the new directory to verify a build works

exitCode = main(['with_ts', '--typescript'], captureError);
if (exitCode != 0) fail('should be success');
let pkgContent = fs.readFileSync('with_ts/package.json', {encoding: 'utf-8'});
if (pkgContent.indexOf('"@bazel/typescript": "latest"') < 0) {
  fail('should install @bazel/typescript dependency', pkgContent);
}
