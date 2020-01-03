const fs = require('fs');
const args = process.argv.slice(2);
const outfile = args.shift();
fs.writeFileSync(outfile, JSON.stringify(args, null, 2), 'utf-8');
