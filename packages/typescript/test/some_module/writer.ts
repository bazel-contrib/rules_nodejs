import {writeFileSync} from 'fs';

const content = process.argv[2];
const outputPath = process.argv[3];

writeFileSync(outputPath, content, {encoding: 'utf8'});
