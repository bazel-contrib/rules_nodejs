const {readFileSync} = require('fs');
const assert = require('assert');

console.error('Test running in working directory', process.cwd())
// this test should be run in a working directory with
// that file in it
assert.strictEqual('console.log("hello world")', readFileSync('app.js', 'utf-8'));
