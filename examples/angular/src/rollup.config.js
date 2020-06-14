import commonjs from '@rollup/plugin-commonjs';
import node from '@rollup/plugin-node-resolve';

module.exports = {
  plugins: [
    node({
      mainFields: ['browser', 'es2015', 'module', 'jsnext:main', 'main'],
    }),
    commonjs(),
  ],
};
