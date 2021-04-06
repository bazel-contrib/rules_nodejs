const {join} = require('path');
const {readFileSync, lstatSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location = helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/splitting/bundle');

const main = readFileSync(join(location, 'main.js'), {encoding: 'utf8'});
const hasImportOfCore = main.match(/import\(".\/(other-[a-zA-Z0-9]+\.js)"\)/);

if (!hasImportOfCore) {
  console.error(`Expected entry_point 'main.js' to have an import of './other-[hash].js'`);
}

// throws if file does not exist
lstatSync(join(location, hasImportOfCore && hasImportOfCore[1]));

process.exit(hasImportOfCore ? 0 : 1);
