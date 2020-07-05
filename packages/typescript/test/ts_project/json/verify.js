const assert = require('assert');

const files = process.argv.slice(2);
assert.ok(files.some(f => f.endsWith('json/bar.json')), 'Missing bar.json');
assert.ok(files.some(f => f.endsWith('json/subdir/foo.json')), 'Missing subdir/foo.json');
assert.ok(files.some(f => f.endsWith('json/foobar/bar.json')), 'Missing outdir bar.json');
assert.ok(
    files.some(f => f.endsWith('json/foobar/subdir/foo.json')), 'Missing outdir subdir/foo.json');
