const fs = require('fs');
process.chdir(require('path').join(process.env['TEST_SRCDIR'], 'e2e_stylus'));
console.error(fs.readdirSync('.'))
const expected = fs.readFileSync('golden.css', 'utf-8');
const actual = fs.readFileSync('test.css', 'utf-8');
if (expected !== actual) {
  console.error(`FAILED. Expected\n${expected}\n but was\n${actual}`);
  process.exitCode = 1;
}
