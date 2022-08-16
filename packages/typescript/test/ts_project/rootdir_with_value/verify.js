const assert = require('assert');

const files = process.argv.slice(2);
assert.ok(files.some(f => f.endsWith('rootdir_with_value/a.js')), 'Missing a.js');

// Test that the only the top-level matching "rootdir" is removed.
// NOTE: This should never fail directly, as the bug being fixed is a build-time error.
assert.ok(files.some(f => f.endsWith('rootdir_with_value/deep/subdir/b.js')), 'Missing b.js');
