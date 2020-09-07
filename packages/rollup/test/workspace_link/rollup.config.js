import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

module.exports = {
  onwarn: (warning) => {
    // Always fail on warnings, assuming we don't know which are harmless.
    // We can add exclusions here based on warning.code, if we discover some
    // types of warning should always be ignored under bazel.
    throw new Error(warning.message);
  },
  plugins: [
    nodeResolve(),
    commonjs(),
  ],
};
