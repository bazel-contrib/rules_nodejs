const fs = require('fs');

const diagnostics = fs.readFileSync('internal/node/test/diagnostics.out', {encoding: 'utf8'});
const count = diagnostics.trim().split('\n').length;

console.log(`Terser produced ${count} diagnostic${count > 1 ? 's' : ''}`);
