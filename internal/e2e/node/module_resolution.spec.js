const Module = require('module');
const path = require('path');

const node_resolve_index = require('node_resolve_index');
const node_resolve_index_2 = require('node_resolve_index_2');
const node_resolve_index_3 = require('node_resolve_index_3');
const node_resolve_index_4 = require('node_resolve_index_4');
const node_resolve_main = require('node_resolve_main');
const node_resolve_main_2 = require('node_resolve_main_2');
const node_resolve_nested_main = require('node_resolve_nested_main');
const lib1 = require('lib1');
const lib1some = require('lib1/src/some');

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
  it('should respect paths options for require.resolve', () => {
    const customPath = path.join(__dirname, 'lib1', 'src');
    const p = require.resolve('./index.js', {paths: [customPath]})
    expect(p).toEqual(path.join(customPath, 'index.js'));
  });
  it('should respect parent paths option for Module._resolveFilename', () => {
    const custom_path = path.join(__dirname, 'lib1', 'src', 'node_modules');
    const p = Module._resolveFilename('test', {paths: [custom_path]});
    expect(p).toEqual(path.join(custom_path, 'test', 'index.js'));
  });
});