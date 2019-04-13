const fs = require('fs');
const path = require('path');

function checkExists(name) {
  if (!fs.existsSync(require.resolve(path.join(__dirname, name)))) {
    fail(`Output ${name} does not exist.`);
  }
}

// TODO: the right assertions are to load up the source-map library
// and assert that the sourcemap actually maps back to the sources

describe('outputgroups', () => {
  it('should produce a es2015 sourcemap', () => {
    checkExists('bundle.es2015.js');
    checkExists('bundle_chunks_es2015/additional_entry.js');
    checkExists('bundle_chunks_es2015/additional_entry.js.map');
    checkExists('bundle_chunks_es2015/main1.js');
    checkExists('bundle_chunks_es2015/main1.js.map');
  });
  it('should produce a es5_min sourcemap', () => {
    checkExists('bundle.min.js');
    checkExists('bundle_chunks_min/additional_entry.js');
    checkExists('bundle_chunks_min/additional_entry.js.map');
    checkExists('bundle_chunks_min/main1.js');
    checkExists('bundle_chunks_min/main1.js.map');
  });
  it('should produce a es5_min_debug sourcemap', () => {
    checkExists('bundle.min_debug.js');
    checkExists('bundle_chunks_min_debug/additional_entry.js');
    checkExists('bundle_chunks_min_debug/additional_entry.js.map');
    checkExists('bundle_chunks_min_debug/main1.js');
    checkExists('bundle_chunks_min_debug/main1.js.map');
  });
});
