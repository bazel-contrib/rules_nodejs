const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER'])
const tsPath = runfiles.resolve('npm_typescript-4.3.5')
require(tsPath + "/package/bin/tsc")
