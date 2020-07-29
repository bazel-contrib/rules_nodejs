const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
  output: {
    banner: '// clang-format off',
  },
  plugins: [commonjs()],
};
