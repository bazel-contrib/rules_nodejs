const {runfiles} = require('@bazel/runfiles');

const closureOutput = runfiles.resolve('examples_closure/bundle.js');

// Assert that it's minified
require('fs').readFile(closureOutput, 'utf-8', (err, content) => {
  if (content.trim().split(/\r?\n/).length > 1) {
    console.error('Bundle is more than one line');
    console.error(content);
    process.exitCode = 1;
  }
});

// Assert that the code works
let alerted;
global.alert = function(s) {
  alerted = s;
};

require(closureOutput);
const expected = 'Hello, New user';
if (alerted !== expected) {
  console.error(`expected alert ${expected} but was ${alerted}`);
  process.exitCode = 1;
}
