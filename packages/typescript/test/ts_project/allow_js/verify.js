const assert = require('assert');

const output_files = process.argv.slice(2);
for (const file of ['a', 'b']) {
    assert.ok(output_files.some(f => f.endsWith(`out/${file}.d.ts`)), `Missing ${file}.d.ts`);
    assert.ok(output_files.some(f => f.endsWith(`out/${file}.d.ts.map`)), `Missing ${file}.d.ts.map`);
    assert.ok(output_files.some(f => f.endsWith(`out/${file}.js`)), `Missing ${file}.js`);
}
