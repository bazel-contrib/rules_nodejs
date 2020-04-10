const fs = require('fs');
const args = process.argv.slice(2);
fs.writeFileSync(args.shift(), JSON.stringify(process.env, null, 2), 'utf-8');
