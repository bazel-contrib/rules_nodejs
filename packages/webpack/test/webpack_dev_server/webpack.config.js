const {resolve, join} = require('path');

console.log(`\n\n\n${process.cwd()}\n\n\n`)

module.exports = {
  mode: 'development',
  entry: resolve(__dirname, './foo.js'),
  devServer: {
    static: {
      directory: join(__dirname, 'public'),
      serveIndex: true,
    },
    webSocketServer: {
      type: 'ws',
    },
  },
};
