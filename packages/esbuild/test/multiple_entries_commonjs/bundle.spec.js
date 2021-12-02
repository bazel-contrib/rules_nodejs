const {join} = require('path');
const {readFileSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location = helper.resolve(
    'build_bazel_rules_nodejs/packages/esbuild/test/multiple_entries_commonjs/bundle/');

const a = readFileSync(join(location, 'a.js'), {encoding: 'utf8'});
const b = readFileSync(join(location, 'b.js'), {encoding: 'utf8'});

const aHasPathCommonJsRequire = a.includes('require("path")');
const bHasPathCommonJsRequire = b.includes('require("path")');

if (!aHasPathCommonJsRequire) {
  console.error('Expected `a.js` file to contain a CommonJS require expression for `path`.');
  process.exitCode = 3;
}

if (!bHasPathCommonJsRequire) {
  console.error('Expected `b.js` file to contain a CommonJS require expression for `path`.');
  process.exitCode = 3;
}
