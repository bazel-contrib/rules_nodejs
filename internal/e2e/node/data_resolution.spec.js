const fs = require('fs');
const path = require('path');

describe('node data resolution', () => {
  const relativeDataPath = './data/data.json';

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
    if (process.platform.startsWith('win')) {
      // On Windows, file location is the original one and not sandboxed.
      // This means we cannot correctly exclude relative paths that aren't part of the runfiles.
      return;
    }
    // This file exists in the source folder but is not in the data array.
    expect(() => require.resolve('./data/missing-data.json')).toThrow();
  });
  it('should be able to resolve paths relative to data files', () => {
    if (process.platform.startsWith('win')) {
      // On Windows, file location is the original one and not sandboxed.
      // This means we cannot resolve paths relative to data files back to built files.
      return;
    }

    const resolvedRelativeDataPath = require.resolve(relativeDataPath);
    const thisFilePath = __filename;
    const relativePathFromDataToThisFile = path.join('../', path.basename(thisFilePath));
    const resolvedPathFromDataToThisFile = require.resolve(path.join(
      path.dirname(resolvedRelativeDataPath), relativePathFromDataToThisFile));

    expect(resolvedPathFromDataToThisFile).toEqual(thisFilePath);
  });
});