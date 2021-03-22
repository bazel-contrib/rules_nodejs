const assert = require('assert');
const {existsSync} = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const tarPath = runfiles.resolve('npm_string-width-3.1.0/string-width-3.1.0.tgz');

assert.ok(existsSync(tarPath));
