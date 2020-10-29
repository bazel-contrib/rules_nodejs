const assert = require('assert');

const types_files = process.argv.slice(2, 4);
const code_files = process.argv.slice(4, 6);
assert.ok(types_files.some(f => f.endsWith('out/a.d.ts')), 'Missing a.d.ts');
assert.ok(types_files.some(f => f.endsWith('out/a.d.ts.map')), 'Missing a.d.ts.map');
