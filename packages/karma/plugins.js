// This file reexports dependencies of @bazel/karma so that the
// Bazel-generated Karma config could load the actual versions specified in
// this package.

module.exports = [
  require('./index'),
  require('karma-chrome-launcher'),
  require('karma-firefox-launcher'),
  require('karma-jasmine'),
  require('karma-requirejs'),
  require('karma-sauce-launcher'),
  require('karma-sourcemap-loader'),
];
