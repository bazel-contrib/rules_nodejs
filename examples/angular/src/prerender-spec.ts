import { readFileSync } from 'fs';

const indexPathFlagIdx = process.argv.findIndex(arg => arg === '--index');
const indexPath = process.argv[indexPathFlagIdx + 1];

const routeFlagIdx = process.argv.findIndex(arg => arg === '--route');
const route = process.argv[routeFlagIdx + 1];

const expectedElementsFlagIdx = process.argv.findIndex(arg => arg === '--expected');
const elements = process.argv.slice(expectedElementsFlagIdx + 1);

const index = readFileSync(indexPath.substring(indexPath.indexOf('/') + 1), { encoding: 'utf8' });

// check the index has the route stamped as a comment at the start
if (!index.trim().startsWith(`<!-- route: ${route} -->`)) {
  console.error(`Expected index ${indexPath} to start with '<!-- route: ${route} -->', but this was not found`);
  process.exit(1);
}

if (!elements) {
  // no elements to check for, and no errors above, all is good
  process.exit(0);
}

// check index contains the expected elements
elements
  .forEach(element => {
    const position = index.indexOf(`<${element}`);
    if (position === -1) {
      console.error(`Expected index to contain element ${element}, but this was not found`);
      process.exit(1);
    }
  });
