const path = require('path');
const fs = require('fs');

// We want the jasmine-core version that is a transitive dependency of jasmine, however,
// jasmine does not provide a re-export of its jasmine-core so we need resolve jasmine-core
// from jasmine/node_modules/jasmine-core if it exists but from the base path of the jasmine
// that @bazel/jasmine depends on which is path.dirname(require.resolve('jasmine/package.json'))
const jasmineDir = path.dirname(require.resolve(path.posix.join('jasmine', 'package.json')));
const jasmineCore =
    fs.existsSync(path.posix.join(jasmineDir, 'node_modules', 'jasmine-core', 'package.json')) ?
    require(path.posix.join(jasmineDir, 'node_modules', 'jasmine-core')) :
    require('jasmine-core');

// a boot function for use in user bootstrap code:
// require('@bazel/jasmine').boot()
function boot() {
  jasmineCore.boot(jasmineCore);
}
exports.boot = boot;

// re-export jasmine and its transitive dep jasmine-core
exports.jasmine = require('jasmine');
exports.jasmineCore = jasmineCore;
