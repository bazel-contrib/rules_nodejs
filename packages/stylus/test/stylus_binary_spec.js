console.log(process.cwd());
const cssPath = require.resolve('build_bazel_rules_nodejs/packages/stylus/test/file.css');
const content = require('fs').readFileSync(cssPath, {encoding: 'utf-8'});
if (content.indexOf('body #logo') < 0) {
  console.error('Expected the css file to be transformed');
  process.exitCode = 1;
}
if (content.indexOf('width:10px') < 0) {
  console.error('Expected the css file to be transformed');
  process.exitCode = 1;
}
if (content.match(/\r|\n/)) {
  console.error('expected compressed but contained newlines', content);
  process.exitCode = 1;
}
// the four ../ segments here are from bazel-out/[arch]/bin/test/ back to the workspace root
// users will probably have a final packaging where the original png file is layed out
// next to the css file, so this seems undesirable...
if (content.indexOf('url("../../../../test/subdir/baz.png")') < 0) {
  console.error(
      'expected relative url to be resolved, see ' +
      'http://stylus-lang.com/docs/executable.html#resolving-relative-urls-inside-imports' +
      '\n' + content);
  process.exitCode = 1;
}