const node_resolve_index = require('node_resolve_index');
const node_resolve_index_2 = require('node_resolve_index_2');
const node_resolve_index_3 = require('node_resolve_index_3');
const node_resolve_index_4 = require('node_resolve_index_4');
const node_resolve_main = require('node_resolve_main');
const node_resolve_main_2 = require('node_resolve_main_2');
const node_resolve_nested_main = require('node_resolve_nested_main');
const lib1 = require('lib1');
const lib1some = require('lib1/src/some');
const data_resolve_relative = require.resolve('./data/data.json');
const fs = require('fs');

describe('node npm resolution', () => {
  it('should resolve to index.js by default', () => {
    expect(node_resolve_index).toEqual('node_resolve_index');
  });
  it('should resolve to index.js from package.json when "main" is "."', () => {
    expect(node_resolve_index_2).toEqual('node_resolve_index_2');
  });
  it('should resolve to index.js from package.json when "main" is "./"', () => {
    expect(node_resolve_index_3).toEqual('node_resolve_index_3');
  });
  it('should resolve to index.js from package.json when there is no "main"', () => {
    expect(node_resolve_index_4).toEqual('node_resolve_index_4');
  });
  it('should resolve to main.js from package.json when "main" is "main"', () => {
    expect(node_resolve_main).toEqual('node_resolve_main');
  });
  it('should resolve to main.js from package.json when "main" is "main.js"', () => {
    expect(node_resolve_main_2).toEqual('node_resolve_main_2');
  });
  it('should resolve to main.js from a nested package.json', () => {
    expect(node_resolve_nested_main).toEqual('node_resolve_nested_main');
  });
  it('should resolve a nested index', () => {
    expect(lib1.a).toEqual('lib1 content');
  });
  it('should be able to deep-import from a nested src dir', () => {
    expect(lib1some.a).toEqual('lib1 content');
  });
});

describe('node data resolution', () => {
  it('should be able to resolve data files', () => {
    const dataContent = fs.readFileSync(data_resolve_relative);
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
});