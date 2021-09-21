const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
  output: {
    banner: `// Generated from:   bazel run //packages/node-patches:update

/**
 * @fileoverview patches some Node built-in APIs to prevent programs escaping from Bazel's sandbox.
 * 
 * A common source of hermeticity bugs in Node programs is that they tend to always resolve
 * symlinks, due to the npm idiom of symlinking dependencies with 'npm link'.
 * These patches hide the symlinks which exit the sandbox, making them appear to programs as
 * if they are regular files/directories.
 */
// clang-format off`,
  },
  plugins: [commonjs()],
};
