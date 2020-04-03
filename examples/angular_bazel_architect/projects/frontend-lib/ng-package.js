
const { resolve } = require('path');

module.exports = {
  dest: resolve(process.argv.pop()),
  lib: {
    entryFile: 'src/public-api.ts'
  }
}

