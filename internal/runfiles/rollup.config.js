const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    // The runfile helpers use a dynamic import for loading the
    // NodeJS patch script. We want to preserve such dynamic imports.
    commonjs({ ignoreDynamicRequires: true }),
  ],
};
