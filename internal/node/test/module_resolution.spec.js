// test node npm resolution
if (require('node_resolve_index') !== 'node_resolve_index') {
  console.error('should resolve to index.js by default');
  process.exitCode = 1;
}

if (require('node_resolve_index_2') !== 'node_resolve_index_2') {
  console.error('should resolve to index.js from package.json when "main" is "."');
  process.exitCode = 1;
}

if (require('node_resolve_index_3') !== 'node_resolve_index_3') {
  console.error('should resolve to index.js from package.json when "main" is "./"');
  process.exitCode = 1;
}

if (require('node_resolve_index_4') !== 'node_resolve_index_4') {
  console.error('should resolve to index.js from package.json when there is no "main"');
  process.exitCode = 1;
}

if (require('node_resolve_main') !== 'node_resolve_main') {
  console.error('should resolve to main.js from package.json when "main" is "main"');
  process.exitCode = 1;
}

if (require('node_resolve_main_2') !== 'node_resolve_main_2') {
  console.error('should resolve to main.js from package.json when "main" is "main.js"');
  process.exitCode = 1;
}

if (require('node_resolve_nested_main') !== 'node_resolve_nested_main') {
  console.error('should resolve to main.js from a nested package.json');
  process.exitCode = 1;
}

if (require('lib1').a !== 'lib1 content') {
  console.error('should resolve a nested index');
  process.exitCode = 1;
}

if (require('lib1/src/some').a !== 'lib1 content') {
  console.error('should be able to deep-import from a nested src dir');
  process.exitCode = 1;
}
