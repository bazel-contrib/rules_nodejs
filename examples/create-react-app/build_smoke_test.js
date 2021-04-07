const assert = require('assert');
const fs = require('fs');
const {runfiles} = require('@bazel/runfiles');

// Make sure there's a file like build/static/js/main.12345678.chunk.js
const jsDir = runfiles.resolvePackageRelative('build/static/js');
assert.ok(fs.readdirSync(jsDir).some(f => /main\.[0-9a-f]{8}\.chunk\.js/.test(f)));
