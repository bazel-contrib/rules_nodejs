const fs = require('fs');
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
const content = fs.readFileSync(runfiles.resolve('e2e_webapp/out.min/app.js'), 'utf-8');
if (content.indexOf('import("./strings') < 0) {
  console.error(content);
  process.exitCode = 1;
}
