const assert = require('assert');
const {existsSync, statSync} = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const tarPath = runfiles.resolve('npm_typescript-3.5.3/typescript-3.5.3.tgz');

assert.ok(existsSync(tarPath));

// The size of https://www.npmjs.com/package/typescript/v/3.5.3
expectedSize = 7960741;
assert.strictEqual(
    statSync(tarPath).size, expectedSize,
    `Expected to download the typescript 3.5.3 release which is ${expectedSize} bytes`);
