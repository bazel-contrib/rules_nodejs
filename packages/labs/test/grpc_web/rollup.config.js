import commonjs from '@rollup/plugin-commonjs';
import nodeRequire from '@rollup/plugin-node-resolve';

module.exports = {
  plugins: [
    nodeRequire(),
    commonjs(),
  ],
};
