const path = require("path");
const Module = require("module");

console.log('hello ' + require.resolve("./test.js", { paths: [ path.join(__dirname, 'test') ] }));
console.log('hello ' + Module._resolveFilename("test", { paths: [ path.join(__dirname, 'test', 'node_modules') ] }));
