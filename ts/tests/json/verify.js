const assert = require('assert');

const files = process.argv.slice(2);
assert.ok(files.some(f => f.endsWith('json/bar.json')), 'Missing bar.json');
assert.ok(files.some(f => f.endsWith('json/subdir/foo.json')), 'Missing subdir/foo.json');
assert.ok(files.some(f => f.endsWith('json/foobar/bar.json')), 'Missing outdir bar.json');
assert.ok(
    files.some(f => f.endsWith('json/foobar/subdir/foo.json')), 'Missing outdir subdir/foo.json');

// verify tsconfig.json files weren't pulled in by the implicit *.json src glob if resolveJsonModule = true
assert.ok(files.every(f => !f.substring(f.lastIndexOf('/')).includes("tsconfig")), "tsconfig.json included");