const fs = require('fs');
const path = require('path');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

const min_js = path.join(runfiles.resolvePackageRelative('minified.js'));
const content = fs.readFileSync(min_js, 'utf-8');
if (!content.includes('{console.error("thing")}')) {
  console.error(content);
  process.exitCode = 1;
}

const dir = fs.readdirSync(path.join(path.dirname(min_js), 'dir_output'));
if (!dir.includes('terser_input.js')) {
  console.error(dir), process.exitCode = 1;
}