const node = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const amd = require('rollup-plugin-amd');
const replace = require('rollup-plugin-re');

module.exports = {
  plugins: [
    // Work-around for the generated Angular ViewEngine ngfactory imports that
    // starts with `examples_angular_view_engine/external/npm/node_modules/`.
    replace({
      patterns: [{
        match: /\.ngfactory\.mjs/,
        test: 'examples_angular_view_engine/external/npm/node_modules/',
        replace: '',
      }]
    }),
    node({
      mainFields: ['browser', 'es2015', 'module', 'jsnext:main', 'main'],
    }),
    amd({
      // Work-around for Angular ngfactory issue https://github.com/angular/angular/issues/29491.
      // Filter to only convert .ngfactory.js files since any UMD files that may be bundled will
      // break with the AMD plugin. In addition, the @buxlabs/amd-to-es6 npm library that is used
      // by rollup-plugin-amd needs to be patched so that the ngc generated AMD .ngfactory.js files
      // (configured by angular-metadata.tsconfig.json) have their imports correctly transformed to
      // es6. See /examples/angular_view_engine/patches/@buxlabs+amd-to-es6+0.13.3.patch.
      include: /\.ngfactory\.js$/i,
    }),
    commonjs(),
  ],
};
