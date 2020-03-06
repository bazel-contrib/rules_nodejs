# Jasmine rules for Bazel

The Jasmine rules run tests under the Jasmine framework with Bazel.

## Installation

Add the `@bazel/jasmine` npm package to your `devDependencies` in `package.json`.

Your `WORKSPACE` should declare a `yarn_install` or `npm_install` rule named `npm`.
It should then install the rules found in the npm packages using the `install_bazel_dependencies` function.

This causes the `@bazel/jasmine` package to be installed as a Bazel workspace named `npm_bazel_jasmine`.

