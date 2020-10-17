const fs = require('fs');
const args = process.argv.slice(2);
const outfile = args.shift();
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const golden = runfiles.resolve('rules_nodejs/internal/node/test/test_runfiles_helper.golden');
fs.writeFileSync(outfile, fs.readFileSync(golden, 'utf-8'), 'utf-8');
