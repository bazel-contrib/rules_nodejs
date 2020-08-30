import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';

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
  }
}

let banner = `/**
 * @license A dummy license banner that goes at the top of the file.
 * This is version ${version}
 */
`;


module.exports = {
  onwarn: (warning) => {
    // Always fail on warnings, assuming we don't know which are harmless.
    // We can add exclusions here based on warning.code, if we discover some
    // types of warning should always be ignored under bazel.
    throw new Error(warning.message);
  },
  external: ['some_global_var'],
  output: {name: 'bundle', banner, globals: {some_global_var: 'runtime_name_of_global_var'}},
  plugins: [
    nodeResolve(),
    commonjs(),
    json({preferConst: true}),
  ],
};
