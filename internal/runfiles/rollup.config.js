const commonjs = require('@rollup/plugin-commonjs');
const {nodeResolve} = require('@rollup/plugin-node-resolve');

module.exports = { 
  output: {
    // Since we check-in the bundle, add a comment that disables
    // clang-format for the checked-in file.
    banner: '// clang-format off',
  },

  plugins: [
    nodeResolve({preferBuiltins: true}),
    // The runfile helpers use a dynamic import for loading the
    // NodeJS patch script. We want to preserve such dynamic imports.
    commonjs({ignoreDynamicRequires: true}),
  ],
};
