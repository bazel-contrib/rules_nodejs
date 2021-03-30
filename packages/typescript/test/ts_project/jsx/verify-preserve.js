const assert = require('assert');

const files = process.argv.slice(2);
assert.ok(files.some(f => f.endsWith('out/a.d.ts')), 'Missing a.d.ts');
assert.ok(files.some(f => f.endsWith('out/a.d.ts.map')), 'Missing a.d.ts.map');
assert.ok(files.some(f => f.endsWith('out/a.jsx.map'), 'Missing a.jsx.map'));
assert.ok(files.some(f => f.endsWith('out/a.jsx'), 'Missing a.jsx'));
assert.ok(files.some(f => f.endsWith('out/b.jsx'), 'Missing b.jsx'));
