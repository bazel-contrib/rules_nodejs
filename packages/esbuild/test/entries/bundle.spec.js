const {join} = require('path');
const {readFileSync, lstatSync} = require('fs');

const helper = require(process.env.BAZEL_NODE_RUNFILES_HELPER);
const location = helper.resolve('build_bazel_rules_nodejs/packages/esbuild/test/entries/bundle/');

const a = readFileSync(join(location, 'a.js'), {encoding: 'utf8'});
const b = readFileSync(join(location, 'b.js'), {encoding: 'utf8'});
const aHasImportOfChunk = a.match(/\/(chunk-[a-zA-Z0-9]+\.js)";/);
const bHasImportOfChunk = b.match(/\/(chunk-[a-zA-Z0-9]+\.js)";/);

if (!aHasImportOfChunk || !bHasImportOfChunk) {
  console.error(`Expected entry_points 'a.js' and 'b.js' to have an import of './chunk-[hash].js'`);
}

if (aHasImportOfChunk[1] !== bHasImportOfChunk[1]) {
  console.error(`Expected entry_points 'a.js' and 'b.js' to the same shared chunk`);
}

// throws if file does not exist
lstatSync(join(location, aHasImportOfChunk && aHasImportOfChunk[1]));

process.exit(
    (aHasImportOfChunk && bHasImportOfChunk && aHasImportOfChunk[1] === bHasImportOfChunk[1]) ? 0 :
                                                                                                1);
