// test node data resolution
const fs = require('fs');
const path = require('path');

const relativeDataPath = './data/data.json';
const isBuiltFile = __filename.endsWith('_built.spec.js');

(function() {
const resolvedRelativeDataPath = require.resolve(relativeDataPath);
const dataContent = fs.readFileSync(resolvedRelativeDataPath);
if (JSON.stringify(JSON.parse(dataContent)) !== '{"value":42}') {
  console.error('should be able to resolve data files through relative paths');
  process.exitCode = 1;
}
})();

(function() {
const resolvedAbsoluteDataPath = require.resolve(path.join(__dirname, relativeDataPath));
const dataContent = fs.readFileSync(resolvedAbsoluteDataPath);
if (JSON.stringify(JSON.parse(dataContent)) !== '{"value":42}') {
  console.error('should be able to resolve data files through absolute paths');
  process.exitCode = 1;
}
})();

(function() {
if (process.platform.startsWith('win') && !isBuiltFile) {
  // On Windows, file location for source files is the original one and not sandboxed.
  // This means we cannot correctly exclude relative paths that aren't part of the runfiles.
  try {
    require.resolve('./data/missing-data.json');
  } catch (_) {
    console.error(
        'should throw on Windows when resolving relative paths that are not part of runfiles');
    process.exitCode = 1;
  }
} else {
  // This file exists in the source folder but is not in the data array.
  try {
    require.resolve('./data/missing-data.json');
    console.error('should throw when resolving files that are outside the sandbox');
    process.exitCode = 1;
  } catch (_) {
  }
}
})();

(function() {
const resolvedRelativeDataPath = require.resolve(relativeDataPath);
const thisFilePath = __filename;
const relativePathFromDataToThisFile = path.join('../', path.basename(thisFilePath));
const joinedPathFromDataToThisFile =
    path.join(path.dirname(resolvedRelativeDataPath), relativePathFromDataToThisFile);
const resolvedPathFromDataToThisFile = require.resolve(joinedPathFromDataToThisFile);
if (resolvedPathFromDataToThisFile !== thisFilePath) {
  console.error('should be able to resolve paths relative to data files');
  process.exitCode = 1;
}
})();
