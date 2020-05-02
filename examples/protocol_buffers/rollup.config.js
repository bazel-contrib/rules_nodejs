const commonjs = require('rollup-plugin-commonjs');
const nodeRequire = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');

const React = require('react');
const ReactDOM = require('react-dom');

module.exports = {
  plugins: [
    nodeRequire(),
    commonjs({
      namedExports: {
        'node_modules/react/index.js': Object.keys(React),
        'node_modules/react-dom/index.js': Object.keys(ReactDOM),
      },
    }),
    replace({'process.env.NODE_ENV': JSON.stringify('production')}),
  ],
};
