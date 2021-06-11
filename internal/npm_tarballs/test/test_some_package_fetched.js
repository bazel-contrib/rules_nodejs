const assert = require('assert');
const {existsSync, statSync} = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const tarPath = runfiles.resolve('npm_typescript-4.3.2/typescript-4.3.2.tgz');

assert.ok(existsSync(tarPath));

// The size of https://www.npmjs.com/package/typescript/v/4.3.2
expectedSize = 10624314;
assert.strictEqual(
    statSync(tarPath).size, expectedSize,
    `Expected to download the typescript 4.3.2 release which is ${expectedSize} bytes`);
