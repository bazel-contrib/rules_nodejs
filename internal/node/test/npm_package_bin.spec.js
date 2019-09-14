const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(require.resolve(__dirname + '/minified.js')), 'utf-8');
if (!content.includes('{console.error("thing")}')) {
  console.error(content);
  process.exitCode = 1;
}
