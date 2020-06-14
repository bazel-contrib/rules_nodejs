import json from '@rollup/plugin-json';

module.exports = {
  plugins: [
    json({preferConst: true}),
  ],
};
