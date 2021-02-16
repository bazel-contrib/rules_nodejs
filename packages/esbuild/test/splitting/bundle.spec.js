const {join} = require('path');
const {readFileSync, lstatSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location = helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/splitting/bundle');

const main = readFileSync(join(location, 'main.js'), {encoding: 'utf8'});
const hasImportOfCore = main.indexOf(`import("./other.js")`) > -1;

if (!hasImportOfCore) {
  console.error(`Expected entry_point 'main.js' to have an import of './other.js'`);
}

// throws if file does not exist
lstatSync(join(location, 'other.js'));

process.exit(hasImportOfCore ? 0 : 1);
