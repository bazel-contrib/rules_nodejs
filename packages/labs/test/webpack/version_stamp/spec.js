const fs = require('fs');
const {runfiles} = require('build_bazel_rules_nodejs/internal/linker');

const LICENSE_HEADER = `/*!
 * @license A dummy license banner that goes at the top of the file.
 * This is version v1.2.3
 */!`;

describe('webpack version stamp handling', () => {
  it('should produce an output with version stamp', () => {
    const file = runfiles.resolvePackageRelative('version_stamp.js');
    const bundle = fs.readFileSync(file, 'utf-8');
    expect(bundle.startsWith(LICENSE_HEADER)).toBeTruthy();
  });
});
