const assert = require('assert');

const files = process.argv.slice(2);
assert.ok(files.some(f => f.endsWith('rootdir_with_value/a.js')), 'Missing a.js');
