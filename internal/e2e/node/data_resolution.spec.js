const fs = require('fs');
const path = require('path');

describe('node data resolution', () => {
  const relativeDataPath = './data/data.json';
  const isBuiltFile = __filename.endsWith('_built.spec.js');

  it('should be able to resolve data files through relative paths', () => {
    const resolvedRelativeDataPath = require.resolve(relativeDataPath);
    const dataContent = fs.readFileSync(resolvedRelativeDataPath);
    expect(JSON.parse(dataContent)).toEqual({ "value": 42 });
  });
  it('should be able to resolve data files through absolute paths', () => {
    const resolvedAbsoluteDataPath = require.resolve(path.join(__dirname, relativeDataPath));
    const dataContent = fs.readFileSync(resolvedAbsoluteDataPath);
    expect(JSON.parse(dataContent)).toEqual({ "value": 42 });
  });
  it('should throw when resolving files that are outside the sandbox', () => {
    if (process.platform.startsWith('win') && !isBuiltFile) {
      // On Windows, file location for source files is the original one and not sandboxed.
      // This means we cannot correctly exclude relative paths that aren't part of the runfiles.
      expect(() => require.resolve('./data/missing-data.json')).not.toThrow();
    } else {
      // This file exists in the source folder but is not in the data array.
      expect(() => require.resolve('./data/missing-data.json')).toThrow();
    }
  });
  it('should be able to resolve paths relative to data files', () => {
    const resolvedRelativeDataPath = require.resolve(relativeDataPath);
    const thisFilePath = __filename;
    const relativePathFromDataToThisFile = path.join('../', path.basename(thisFilePath));
    const joinedPathFromDataToThisFile = path.join(path.dirname(resolvedRelativeDataPath), 
      relativePathFromDataToThisFile);
    
    const resolvedPathFromDataToThisFile = require.resolve(joinedPathFromDataToThisFile);
    expect(resolvedPathFromDataToThisFile).toEqual(thisFilePath);
  });
});
