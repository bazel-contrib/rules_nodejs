import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';

/**
* The status files are expected to look like
* BUILD_SCM_HASH 83c699db39cfd74526cdf9bebb75aa6f122908bb
* BUILD_SCM_LOCAL_CHANGES true
* STABLE_BUILD_SCM_VERSION 6.0.0-beta.6+12.sha-83c699d.with-local-changes
* BUILD_TIMESTAMP 1520021990506
*
* Parsing regex is created based on Bazel's documentation describing the status file schema:
*   The key names can be anything but they may only use upper case letters and underscores. The
*   first space after the key name separates it from the value. The value is the rest of the line
*   (including additional whitespaces).
*
* @param {string} p the path to the status file
* @returns a two-dimensional array of key/value pairs
*/
function parseStatusFile(p) {
  if (!p) return [];
  const results = {};
  const statusFile = require('fs').readFileSync(p, {encoding: 'utf-8'});
  for (const match of `\n${statusFile}`.matchAll(/^([A-Z_]+) (.*)/gm)) {
    // Lines which go unmatched define an index value of `0` and should be skipped.
    if (match.index === 0) {
      continue;
    }
    results[match[1]] = match[2];
  }
  return results;
}

// Parse the stamp file produced by Bazel from the version control system
let version = '<unknown>';

const statuses = parseStatusFile(bazel_version_file);
// Don't assume BUILD_SCM_VERSION exists
if (statuses['BUILD_SCM_VERSION']) {
  version = 'v' + statuses['BUILD_SCM_VERSION'];
  if (DEBUG) {
    version += '_debug';
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
