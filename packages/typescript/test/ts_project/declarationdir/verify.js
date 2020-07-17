const assert = require('assert');

const types_files = process.argv.slice(2);
const code_files = process.argv.slice(3);
assert.ok(types_files.some(f => f.endsWith('declarationdir/out/a.d.ts')), 'Missing a.d.ts');
assert.ok(code_files.some(f => f.endsWith('declarationdir/out/a.js')), 'Missing a.js');
