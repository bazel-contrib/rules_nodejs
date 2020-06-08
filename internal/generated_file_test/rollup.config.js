const commonjs = require('rollup-plugin-commonjs');
const nodeRequire = require('rollup-plugin-node-resolve');

module.exports = {
  plugins: [
    nodeRequire(),
    commonjs(),
  ],
};
