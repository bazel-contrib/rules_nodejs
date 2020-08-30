const DEBUG = process.env['COMPILATION_MODE'] === 'dbg';

// Parse the stamp file produced by Bazel from the version control system
let version = '<unknown>';
if (bazel_version_file) {
  const versionTag = require('fs')
                         .readFileSync(bazel_version_file, {encoding: 'utf-8'})
                         .split('\n')
                         .find(s => s.startsWith('BUILD_SCM_VERSION'));
  // Don't assume BUILD_SCM_VERSION exists
  if (versionTag) {
    version = 'v' + versionTag.split(' ')[1].trim();
    if (DEBUG) {
      version += '_debug';
    }
  }
}

const banner = `/**
 * @license A dummy license banner that goes at the top of the file.
 * This is version ${version}
 */
`;

module.exports = {
  output: {banner},
};
