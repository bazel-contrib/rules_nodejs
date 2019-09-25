const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

function checkExists(dir, file) {
  const chunks = runfiles.resolvePackageRelative(dir);
  if (!fs.existsSync(file ? chunks + '/' + file : chunks)) {
    fail(`Output ${name} does not exist.`);
  }
}

// With enable_code_splitting=True there should be 1 chunk. We
// don't know its name ahead of time so just assert the count.
function checkChunkCount(name) {
  expect(fs.readdirSync(runfiles.resolvePackageRelative(name))
             .filter(name => name.startsWith('chunk-') && name.endsWith('.js'))
             .length)
      .toBe(1);
}

// TODO: the right assertions are to load up the source-map library
// and assert that the sourcemap actually maps back to the sources

describe('outputgroups', () => {
  it('should produce a es2015 sourcemap', () => {
    checkExists('bundle.es2015.js');
    checkExists('bundle_chunks_es2015', 'main1.js');
    checkExists('bundle_chunks_es2015', 'main1.js.map');
    checkChunkCount('bundle_chunks_es2015');
  });
  it('should produce a es5_min sourcemap', () => {
    checkExists('bundle.min.js');
    checkExists('bundle_chunks_min', 'main1.js');
    checkExists('bundle_chunks_min', 'main1.js.map');
    checkChunkCount('bundle_chunks_min');
  });
  it('should produce a es5_min_debug sourcemap', () => {
    checkExists('bundle.min_debug.js');
    checkExists('bundle_chunks_min_debug', 'main1.js');
    checkExists('bundle_chunks_min_debug', 'main1.js.map');
    checkChunkCount('bundle_chunks_min_debug');
  });
});

describe('outputgroups multi entry', () => {
  it('should produce a es2015 sourcemap', () => {
    checkExists('bundle_multi_entry.es2015.js');
    checkExists('bundle_multi_entry_chunks_es2015', 'additional_entry.js');
    checkExists('bundle_multi_entry_chunks_es2015', 'additional_entry.js.map');
    checkExists('bundle_multi_entry_chunks_es2015', 'main1.js');
    checkExists('bundle_multi_entry_chunks_es2015', 'main1.js.map');
  });
});
