const path = require('path');

const clangVersion =
    require(path.join(path.dirname(require.resolve('clang-format')), 'package.json')).version;

console.log(clangVersion);

module.exports = {clangVersion}
