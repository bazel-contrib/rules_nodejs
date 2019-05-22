const path = require("path");

console.log('hello ' + require.resolve("./test.js", { path: path.join(__dirname, 'test') }));
