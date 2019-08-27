const fs = require('fs');
const content = fs.readFileSync(require.resolve(__dirname + '/out.min.js'), 'utf-8');
if (content.indexOf('console.error(1)') < 1) {
  console.error(content), process.exitCode = 1;
}
