/**
 * @fileoverview Mimics the semantics of react-scripts
 * Reads inputs and writes outputs relative to the working directory
 */
const fs = require('fs');

const json = JSON.parse(fs.readFileSync('package.json'));
if (json.name != 'chdir_test') {
  throw new Error('read the wrong package.json')
}

if (!fs.existsSync('build')) fs.mkdirSync('build');
fs.writeFileSync('build/app.js', 'console.log("hello world")');
