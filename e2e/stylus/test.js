const fs = require('fs');
const expected = fs.readFileSync(require.resolve('e2e_stylus/golden.css'), 'utf-8');
const actual = fs.readFileSync(require.resolve('e2e_stylus/test.css'), 'utf-8');
if (expected !== actual) {
  console.error(`FAILED. Expected\n${expected}\n but was\n${actual}`);
  process.exitCode = 1;
}
