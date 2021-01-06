const assert = require('assert');

const types_files = process.argv.slice(2, 4);
const code_files = process.argv.slice(4, 6);
assert.ok(
    code_files.some(f => f.endsWith('out/config.json')), `Missing config.json in ${code_files}`);
