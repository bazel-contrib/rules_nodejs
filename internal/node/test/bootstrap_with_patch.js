// test the runfiles.patchRequire() function
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
runfiles.patchRequire();
global.bootstrapped = true;
