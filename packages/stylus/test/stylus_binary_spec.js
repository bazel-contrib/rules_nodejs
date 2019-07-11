console.log(process.cwd());
const cssPath = require.resolve('build_bazel_rules_nodejs/packages/stylus/test/file.css');
const content = require('fs').readFileSync(cssPath, {encoding: 'utf-8'});
if (content.indexOf('body #logo') < 0) {
  console.error('Expected the css file to be transformed');
  process.exitCode = 1;
}
if (content.indexOf('width: 10px') < 0) {
  console.error('Expected the css file to be transformed');
  process.exitCode = 1;
}
