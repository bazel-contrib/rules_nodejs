const path = require("path");

console.log('hello ' + require.resolve("./test.js", { paths: [ path.join(__dirname, 'test') ] }));
