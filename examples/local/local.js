const fs = require('fs');
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));
fs.writeFileSync(args.output, `Hello, ${args.hello}!`);
