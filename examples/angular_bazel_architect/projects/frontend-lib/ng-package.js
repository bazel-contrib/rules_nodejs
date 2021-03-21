const { resolve } = require('path');

const [outputPath] = process.argv.slice(-1);

module.exports = {
  dest: resolve(outputPath),
  lib: {
    entryFile: 'src/public-api.ts'
  }
}
