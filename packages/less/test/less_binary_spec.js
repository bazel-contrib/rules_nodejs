const cssPath = require.resolve('npm_bazel_less/test/foo.css');
const content = require('fs').readFileSync(cssPath, {encoding: 'utf-8'});
if (!content.includes('.link {\n  color: #428bca')) {
  console.error('Expected the css file to be transformed');
  process.exitCode = 1;
}
