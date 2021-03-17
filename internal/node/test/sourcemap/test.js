const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);

const actual = require('fs').readFileSync(runfiles.resolvePackageRelative('actual'));

require('assert').ok(actual.includes('index.ts:1'), `source map support is not installed
    expected stack trace to point to line 1 of index.ts but instead got
    ${actual}
`);
