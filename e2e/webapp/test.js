const fs = require('fs');
const content = fs.readFileSync(require.resolve(__dirname + '/out.min/app.js'), 'utf-8');
if (content.indexOf('import("./strings') < 0) {
  console.error(content);
  process.exitCode = 1;
}
