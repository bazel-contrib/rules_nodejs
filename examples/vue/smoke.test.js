const assert = require('assert');
const fs = require('fs');
const path = require('path');

process.chdir(path.join(__dirname, 'dist'));
assert.ok(fs.readFileSync('index.html', 'utf-8').match(/href=\/js\/app/));
