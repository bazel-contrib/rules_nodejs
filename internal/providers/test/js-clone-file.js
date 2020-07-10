const readFileSync = require('fs').readFileSync;
const writeFileSync = require('fs').writeFileSync;

const inputPath = process.argv[2];
const outputPath = process.argv[3];

const content = readFileSync(inputPath, 'utf8');

writeFileSync(outputPath, content, {encoding: 'utf8'});
