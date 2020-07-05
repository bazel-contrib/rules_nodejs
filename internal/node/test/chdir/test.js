const {readFileSync} = require('fs');
const assert = require('assert');

// this test should be run in a working directory with
// that file in it
assert.equal('console.log("hello world")', readFileSync('build/app.js', 'utf-8'));
